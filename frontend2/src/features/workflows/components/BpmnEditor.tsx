import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import {
  Alert,
  Button,
  Card,
  Space,
  Spin,
  Typography,
} from 'antd'
import {
  CompressOutlined,
  DownloadOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  RedoOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons'
import BpmnModeler from 'bpmn-js/lib/Modeler'

import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css'

import type { BpmnElementSummary } from '../studioValidation'

// ─── Custom Palette — remove data objects, data stores, group e subprocess colapsado ──
//
// O bpmn-js expõe o PaletteProvider padrão via injeção de dependência.
// Para remover entradas, sobrescrevemos getPaletteEntries e filtramos
// as chaves indesejadas. Os itens removidos são:
//   'create.data-object'       → DataObjectReference  (ícone documento)
//   'create.data-store'        → DataStoreReference   (ícone cilindro)
//   'create.subprocess-expanded' → SubProcess colapsado (ícone caixa+quadrado)
//   'create.group'             → Group                (ícone pontilhado)
//
// A lista BLOCKED_PALETTE_ENTRIES pode ser ajustada livremente.

const BLOCKED_PALETTE_ENTRIES = new Set([
  'create.data-object',
  'create.data-store',
  'create.subprocess-expanded',
  'create.group',
])

function CustomPaletteProvider(
  this: any,
  palette: any,
  originalPaletteProvider: any,
) {
  this._palette = palette
  this._original = originalPaletteProvider

  palette.registerProvider(500, this)
}

CustomPaletteProvider.$inject = ['palette', 'paletteProvider']

CustomPaletteProvider.prototype.getPaletteEntries = function () {
  const entries = this._original.getPaletteEntries()
  const filtered: Record<string, unknown> = {}

  for (const key of Object.keys(entries)) {
    if (!BLOCKED_PALETTE_ENTRIES.has(key)) {
      filtered[key] = entries[key]
    }
  }

  return filtered
}

const customPaletteModule = {
  __init__: ['customPaletteProvider'],
  customPaletteProvider: ['type', CustomPaletteProvider],
}


const { Text } = Typography

type BpmnEditorProps = {
  initialXml?: string
  onChange?: (xml: string) => void
  onSelectionChange?: (element: BpmnElementSummary | null) => void
  onElementsChange?: (elements: BpmnElementSummary[]) => void
  height?: number | string
  disabled?: boolean
}

const DEFAULT_BPMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
  id="Definitions_1"
  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Início" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="180" y="120" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

type BpmnModelerInstance = InstanceType<typeof BpmnModeler>

function normalizeXml(xml?: string) {
  return (xml ?? '').trim()
}

function inferKind(type: string): BpmnElementSummary['kind'] {
  if (type === 'bpmn:StartEvent') return 'start'
  if (type === 'bpmn:EndEvent') return 'end'
  if (type === 'bpmn:SequenceFlow') return 'flow'
  if (type.includes('Gateway')) return 'gateway'

  // Notificações do fluxo — disparos automáticos, SEM executor humano.
  // SendTask (ícone envelope) e eventos intermediários de mensagem.
  if (
    type === 'bpmn:SendTask' ||
    type === 'bpmn:IntermediateThrowEvent' ||
    type === 'bpmn:IntermediateCatchEvent'
  ) {
    return 'notification'
  }

  // Tarefas de sistema — execução automática pelo motor, sem executor humano.
  // bpmn:ServiceTask é o elemento padrão para isso (ícone engrenagem).
  if (type === 'bpmn:ServiceTask') {
    return 'system-task'
  }

  // Atividades humanas — têm executor, prazo e ações de decisão.
  // IMPORTANTE: o check de Task vem DEPOIS de SendTask/ServiceTask para evitar
  // que tipos específicos caiam no bucket genérico por engano.
  if (
    type === 'bpmn:Task' ||
    type === 'bpmn:UserTask' ||
    type === 'bpmn:ManualTask' ||
    type === 'bpmn:BusinessRuleTask' ||
    type === 'bpmn:ScriptTask' ||
    type === 'bpmn:ReceiveTask' ||
    type === 'bpmn:SubProcess' ||
    type === 'bpmn:CallActivity'
  ) {
    return 'activity'
  }

  return 'unsupported'
}

function isConfigurableKind(kind: BpmnElementSummary['kind']) {
  return (
    kind === 'start' ||
    kind === 'activity' ||
    kind === 'system-task' ||    // ← tarefas de sistema são configuráveis
    kind === 'notification' ||
    kind === 'gateway' ||
    kind === 'flow' ||
    kind === 'end'
  )
}

function toElementSummary(element: any): BpmnElementSummary | null {
  if (!element || !element.id || !element.type) {
    return null
  }

  if (element.labelTarget || element.type === 'label') {
    return null
  }

  const kind = inferKind(element.type)
  const businessObject = element.businessObject

  return {
    id: element.id,
    type: element.type,
    name:
      typeof businessObject?.name === 'string' && businessObject.name.trim()
        ? businessObject.name
        : undefined,
    kind,
    isConfigurable: isConfigurableKind(kind),
  }
}

function getElementSummaries(modeler: BpmnModelerInstance): BpmnElementSummary[] {
  const elementRegistry = modeler.get('elementRegistry') as any
  const elements = (elementRegistry?.getAll?.() ?? []) as any[]

  return elements
    .map(toElementSummary)
    .filter((item): item is BpmnElementSummary => item !== null)
    .sort((a, b) => a.id.localeCompare(b.id))
}

function downloadTextFile(
  content: string,
  filename: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)

  URL.revokeObjectURL(url)
}

export function BpmnEditor({
  initialXml,
  onChange,
  onSelectionChange,
  onElementsChange,
  height = 900,
  disabled = false,
}: BpmnEditorProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const modelerRef = useRef<BpmnModelerInstance | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const isMountedRef = useRef(false)
  const lastImportedXmlRef = useRef('')
  const lastEmittedXmlRef = useRef('')
  // Prevents openDiagram from being called concurrently or re-entrantly
  const isImportingRef = useRef(false)
  // Holds the latest xml requested while an import was in progress
  const pendingXmlRef = useRef<string | null>(null)
  // Stable ref to callbacks so the modeler useEffect never needs to re-run
  const onChangeRef = useRef(onChange)
  const onSelectionChangeRef = useRef(onSelectionChange)
  const onElementsChangeRef = useRef(onElementsChange)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange }, [onSelectionChange])
  useEffect(() => { onElementsChangeRef.current = onElementsChange }, [onElementsChange])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomPercent, setZoomPercent] = useState(100)
  const [selectedElementLabel, setSelectedElementLabel] = useState(
    'Nenhum elemento selecionado',
  )

  const normalizedInitialXml = useMemo(
    () => normalizeXml(initialXml),
    [initialXml],
  )

  // ── stable helpers (no deps that change) ──────────────────────────────────

  const updateZoomPercent = useCallback(() => {
    const modeler = modelerRef.current
    if (!modeler) return
    const canvas = modeler.get('canvas') as any
    const currentZoom = canvas?.zoom?.()
    if (typeof currentZoom === 'number' && Number.isFinite(currentZoom)) {
      setZoomPercent(Math.round(currentZoom * 100))
    }
  }, [])

  const focusCanvas = useCallback(() => {
    const modeler = modelerRef.current
    if (!modeler) return
    const canvas = modeler.get('canvas') as any
    if (typeof canvas?.focus === 'function') {
      canvas.focus()
      return
    }
    canvasRef.current?.focus()
  }, [])

  const fitViewport = useCallback(() => {
    const modeler = modelerRef.current
    if (!modeler) return
    const canvas = modeler.get('canvas') as any
    canvas?.zoom?.('fit-viewport', 'auto')
    updateZoomPercent()
    focusCanvas()
  }, [focusCanvas, updateZoomPercent])

  /**
   * openDiagram – imports XML into the modeler.
   *
   * Re-entrant calls are queued: if an import is already running, the latest
   * xml is stored in `pendingXmlRef` and processed after the current import
   * finishes. This prevents the ResizeObserver / XML-sync loops.
   */
  const openDiagram = useCallback(
    async (xml?: string) => {
      const modeler = modelerRef.current
      if (!modeler) return

      // Guard: container must have real dimensions (fails inside lazy tabs)
      const container = canvasRef.current
      if (!container || container.clientWidth === 0) return

      // If already importing, just remember the latest xml and bail
      if (isImportingRef.current) {
        pendingXmlRef.current = xml ?? ''
        return
      }

      isImportingRef.current = true
      setLoading(true)
      setError(null)

      const content = normalizeXml(xml) || DEFAULT_BPMN_XML

      try {
        await modeler.importXML(content)
        lastImportedXmlRef.current = content

        // Emit elements
        const elementRegistry = modeler.get('elementRegistry') as any
        const rawElements = (elementRegistry?.getAll?.() ?? []) as any[]
        const summaries = rawElements
          .map(toElementSummary)
          .filter((item): item is BpmnElementSummary => item !== null)
          .sort((a, b) => a.id.localeCompare(b.id))
        onElementsChangeRef.current?.(summaries)

        // Emit xml (only if it actually changed to avoid parent re-renders)
        const result = await modeler.saveXML({ format: true })
        const savedXml = result.xml ?? ''
        const normalizedSaved = normalizeXml(savedXml)
        if (normalizedSaved !== lastEmittedXmlRef.current) {
          lastEmittedXmlRef.current = normalizedSaved
          onChangeRef.current?.(savedXml)
        }

        fitViewport()
      } catch (importError) {
        console.error('Erro ao importar BPMN XML:', importError)
        setError('Não foi possível carregar o diagrama BPMN.')
      } finally {
        isImportingRef.current = false
        if (isMountedRef.current) {
          setLoading(false)
        }

        // Process any xml that arrived while we were importing
        if (pendingXmlRef.current !== null) {
          const next = pendingXmlRef.current
          pendingXmlRef.current = null
          void openDiagram(next)
        }
      }
    },
    // fitViewport is stable (only refs inside); no other changing deps
    [fitViewport],
  )

  // ── one-time modeler setup ─────────────────────────────────────────────────
  // IMPORTANT: this effect intentionally has an empty dep array so the modeler
  // is created only once. Callback changes are handled via refs above.
  useEffect(() => {
    isMountedRef.current = true

    if (!canvasRef.current || modelerRef.current) {
      return () => { isMountedRef.current = false }
    }

    const modeler = new BpmnModeler({ container: canvasRef.current, additionalModules: [customPaletteModule] })
    modelerRef.current = modeler

    const eventBus = modeler.get('eventBus') as any
    const canvas = modeler.get('canvas') as any
    const selection = modeler.get('selection') as any

    // commandStack.changed → sync xml + elements, but never re-import
    const handleCommandStackChanged = async () => {
      if (isImportingRef.current) return
      const elementRegistry = modeler.get('elementRegistry') as any
      const rawElements = (elementRegistry?.getAll?.() ?? []) as any[]
      const summaries = rawElements
        .map(toElementSummary)
        .filter((item): item is BpmnElementSummary => item !== null)
        .sort((a, b) => a.id.localeCompare(b.id))
      onElementsChangeRef.current?.(summaries)

      const result = await modeler.saveXML({ format: true })
      const savedXml = result.xml ?? ''
      const normalizedSaved = normalizeXml(savedXml)
      if (normalizedSaved !== lastEmittedXmlRef.current) {
        lastEmittedXmlRef.current = normalizedSaved
        onChangeRef.current?.(savedXml)
      }

      const currentZoom = canvas?.zoom?.()
      if (typeof currentZoom === 'number' && Number.isFinite(currentZoom)) {
        setZoomPercent(Math.round(currentZoom * 100))
      }
    }

    const handleSelectionChanged = (event: any) => {
      const selected = event?.newSelection?.[0] ?? selection?.get?.()[0] ?? null
      const summary = selected ? toElementSummary(selected) : null
      setSelectedElementLabel(summary ? (summary.name || summary.id) : 'Nenhum elemento selecionado')
      onSelectionChangeRef.current?.(summary)
    }

    // canvas.viewbox.changed fires on every pan/zoom – only update the % display
    const handleCanvasViewboxChanged = () => {
      const currentZoom = canvas?.zoom?.()
      if (typeof currentZoom === 'number' && Number.isFinite(currentZoom)) {
        setZoomPercent(Math.round(currentZoom * 100))
      }
    }

    eventBus.on('selection.changed', handleSelectionChanged)
    eventBus.on('commandStack.changed', handleCommandStackChanged)
    eventBus.on('canvas.viewbox.changed', handleCanvasViewboxChanged)

    // ResizeObserver: only notify bpmn-js that the container was resized.
    // Never calls openDiagram here to avoid re-entrant import loops.
    resizeObserverRef.current = new ResizeObserver(() => {
      try {
        canvas?.resized?.()
        const currentZoom = canvas?.zoom?.()
        if (typeof currentZoom === 'number' && Number.isFinite(currentZoom)) {
          setZoomPercent(Math.round(currentZoom * 100))
        }
      } catch (resizeError) {
        console.error('Erro ao redimensionar canvas BPMN:', resizeError)
      }
    })

    resizeObserverRef.current.observe(canvasRef.current)

    // Double-RAF: first frame schedules paint; second fires after layout so
    // the container has real pixel dimensions before importXML runs.
    let raf1: number
    let raf2: number
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        // Read the current xml from the ref so we don't close over a stale value
        void openDiagram(normalizeXml(initialXml))
      })
    })

    return () => {
      window.cancelAnimationFrame(raf1)
      window.cancelAnimationFrame(raf2)

      resizeObserverRef.current?.disconnect()
      resizeObserverRef.current = null

      try {
        eventBus.off('selection.changed', handleSelectionChanged)
        eventBus.off('commandStack.changed', handleCommandStackChanged)
        eventBus.off('canvas.viewbox.changed', handleCanvasViewboxChanged)
      } catch { /* ignore */ }

      try { modeler.destroy() } catch { /* ignore */ }

      modelerRef.current = null
      isMountedRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // ← intentionally empty: modeler must be created only once

  useEffect(() => {
    const nextXml = normalizedInitialXml

    if (!modelerRef.current) return
    if (!nextXml && lastImportedXmlRef.current === DEFAULT_BPMN_XML) return
    if (nextXml === lastImportedXmlRef.current) return
    if (nextXml === lastEmittedXmlRef.current) return

    void openDiagram(nextXml)
  }, [normalizedInitialXml, openDiagram])

  const handleNewDiagram = async () => {
    await openDiagram(DEFAULT_BPMN_XML)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) return

    try {
      const xml = await file.text()
      await openDiagram(xml)
    } finally {
      event.target.value = ''
    }
  }

  const handleExportXml = async () => {
    const modeler = modelerRef.current
    if (!modeler) return

    const result = await modeler.saveXML({ format: true })

    downloadTextFile(
      result.xml ?? '',
      'workflow.bpmn',
      'application/xml;charset=utf-8',
    )
  }

  const handleExportSvg = async () => {
    const modeler = modelerRef.current
    if (!modeler) return

    const result = await modeler.saveSVG()

    downloadTextFile(
      result.svg ?? '',
      'workflow.svg',
      'image/svg+xml;charset=utf-8',
    )
  }

  const handleUndo = () => {
    const modeler = modelerRef.current
    if (!modeler) return

    const commandStack = modeler.get('commandStack') as any
    commandStack?.undo?.()
    focusCanvas()
  }

  const handleRedo = () => {
    const modeler = modelerRef.current
    if (!modeler) return

    const commandStack = modeler.get('commandStack') as any
    commandStack?.redo?.()
    focusCanvas()
  }

  const handleZoomIn = () => {
    const modeler = modelerRef.current
    if (!modeler) return

    const canvas = modeler.get('canvas') as any
    const current = canvas?.zoom?.()

    if (typeof current === 'number') {
      canvas.zoom(current + 0.1)
      updateZoomPercent()
      focusCanvas()
    }
  }

  const handleZoomOut = () => {
    const modeler = modelerRef.current
    if (!modeler) return

    const canvas = modeler.get('canvas') as any
    const current = canvas?.zoom?.()

    if (typeof current === 'number') {
      canvas.zoom(Math.max(0.2, current - 0.1))
      updateZoomPercent()
      focusCanvas()
    }
  }

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 20 }}
      title="Modelador BPMN"
    >
      <Space wrap style={{ marginBottom: 12 }}>
        <Button
          icon={<PlusOutlined />}
          onClick={handleNewDiagram}
          disabled={disabled}
        >
          Novo fluxo
        </Button>

        <Button
          icon={<FolderOpenOutlined />}
          onClick={handleImportClick}
          disabled={disabled}
        >
          Importar XML
        </Button>

        <Button
          icon={<DownloadOutlined />}
          onClick={handleExportXml}
          disabled={disabled}
        >
          Exportar BPMN
        </Button>

        <Button
          icon={<DownloadOutlined />}
          onClick={handleExportSvg}
          disabled={disabled}
        >
          Exportar SVG
        </Button>

        <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={disabled}>
          Desfazer
        </Button>

        <Button icon={<RedoOutlined />} onClick={handleRedo} disabled={disabled}>
          Refazer
        </Button>

        <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} disabled={disabled} />
        <Button disabled>{zoomPercent}%</Button>
        <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} disabled={disabled} />

        <Button icon={<CompressOutlined />} onClick={fitViewport} disabled={disabled}>
          Ajustar
        </Button>
      </Space>

      <input
        ref={fileInputRef}
        type="file"
        accept=".bpmn,.xml,text/xml,application/xml"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

      <div style={{ marginBottom: 12 }}>
        <Text type="secondary">{selectedElementLabel}</Text>
      </div>

      {error ? (
        <Alert
          type="error"
          showIcon
          title="Falha ao carregar BPMN"
          description={error}
          style={{ marginBottom: 12 }}
        />
      ) : null}

      <div
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          overflow: 'hidden',
          background: '#fff',
          position: 'relative',
        }}
      >
        {loading ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              background: 'rgba(255,255,255,0.72)',
              zIndex: 2,
            }}
          >
            {/* Antd 5.x: `tip` renamed to `description` */}
            <Spin description="Carregando editor BPMN..." />
          </div>
        ) : null}

        <div
          ref={canvasRef}
          tabIndex={0}
          onMouseDown={focusCanvas}
          style={{
            width: '100%',
            height: '100%',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <Text type="secondary">
          Dica: clique dentro do diagrama antes de usar atalhos do teclado.
        </Text>
      </div>
    </Card>
  )
}