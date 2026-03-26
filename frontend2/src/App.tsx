import { useMemo, useState } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Typography,
  Tag,
  Button,
  Space,
  Divider,
} from 'antd'
import {
  DashboardOutlined,
  FileOutlined,
  ApartmentOutlined,
  CheckSquareOutlined,
  UserOutlined,
  LogoutOutlined,
  FolderOpenOutlined,
  DatabaseOutlined,
  TeamOutlined,
  SettingOutlined,
  GlobalOutlined,
  UnorderedListOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'

import { useAuthStore } from './store/authStore'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './pages/Login/LoginPage'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { LDPage } from './pages/LD'
import { DocumentTypesPage } from './pages/DocumentTypes'
import { WorkflowsPage } from './pages/Workflows/WorkflowsPage'
import { WorkflowDetailPage } from './pages/Workflows/WorkflowDetail'
import { WorkflowEditPage } from './pages/Workflows/WorkflowEditPage'
import { WorkflowNewPage } from './pages/Workflows/WorkflowNew'
import { WorkflowDesignerPage } from './pages/Workflows/WorkflowDesignerPage'
import { NotificationTemplatesPage } from './pages/Notifications/NotificationTemplatesPage'
import { DocumentsPage } from './pages/Documents'
import { DocumentNewPage } from './pages/Documents/DocumentNew'
import { DocumentDetailPage } from './pages/Documents/DocumentDetail'
import { TasksPage } from './pages/Tasks'
import { UsersPage } from './pages/Users/UsersPage'
import { OrganizationPage } from './pages/Admin/OrganizationPage'
import { MetadataPage } from './pages/Admin/MetadataPage'
import { EnvironmentSettingsPage } from './pages/Admin/EnvironmentSettings'
import { TenantsPage } from './pages/Platform/TenantsPage'
import { PlatformAdminsPage } from './pages/Platform/PlatformAdminsPage'
import { TenantUsersPage } from './pages/Platform/TenantUsersPage'
import { WorkflowStudioPage } from './pages/Workflows/WorkflowStudioPage'
import { logout } from './api/auth'

const { Header, Sider, Content } = Layout
const { Text } = Typography

type SidebarBrandProps = {
  collapsed: boolean
  title: string
  subtitle: string
  tagText?: string
  logoUrl?: string
  accent?: string
}

function SidebarBrand({
  collapsed,
  title,
  subtitle,
  tagText,
  logoUrl,
  accent = '#1677ff',
}: SidebarBrandProps) {
  return (
    <div
      style={{
        padding: collapsed ? '16px 10px' : '18px 16px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        minHeight: 92,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 12,
          width: '100%',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            minWidth: 42,
            borderRadius: 14,
            overflow: 'hidden',
            background: logoUrl
              ? '#ffffff'
              : `linear-gradient(135deg, ${accent} 0%, #69b1ff 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <AppstoreOutlined style={{ color: '#fff', fontSize: 20 }} />
          )}
        </div>

        {!collapsed && (
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: '#fff',
                fontWeight: 700,
                fontSize: 15,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </div>

            <div
              style={{
                color: 'rgba(255,255,255,0.62)',
                fontSize: 12,
                marginTop: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle}
            </div>

            {tagText && (
              <Tag
                color="blue"
                style={{
                  marginTop: 8,
                  borderRadius: 999,
                  fontSize: 10,
                  paddingInline: 8,
                }}
              >
                {tagText}
              </Tag>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

type SidebarUserCardProps = {
  collapsed: boolean
  name?: string
  role?: string
  accent?: string
}

function SidebarUserCard({
  collapsed,
  name,
  role,
  accent = '#1677ff',
}: SidebarUserCardProps) {
  return (
    <div
      style={{
        margin: collapsed ? '12px 8px 14px' : '12px 12px 14px',
        padding: collapsed ? '10px 0' : '12px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        gap: collapsed ? 0 : 10,
      }}
    >
      <Avatar
        icon={<UserOutlined />}
        style={{
          background: accent,
          boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
        }}
      />

      {!collapsed && (
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name ?? 'Usuário'}
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 11,
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {role ?? 'Perfil'}
          </div>
        </div>
      )}
    </div>
  )
}

type TopbarProps = {
  collapsed: boolean
  onToggle: () => void
  userName?: string
  userRole?: string
  onLogout: () => void
  accent?: string
}

function Topbar({
  collapsed,
  onToggle,
  userName,
  userRole,
  onLogout,
  accent = '#1677ff',
}: TopbarProps) {
  return (
    <Header
      style={{
        background: '#ffffff',
        padding: '0 20px',
        height: 72,
        lineHeight: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #edf0f3',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Space size={12}>
        <Button
          type="text"
          onClick={onToggle}
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </Space>

      <Space size={12}>
        <Button
          type="text"
          icon={<BellOutlined />}
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />

        <Dropdown
          menu={{
            items: [
              {
                key: 'logout',
                label: 'Sair',
                icon: <LogoutOutlined />,
                onClick: onLogout,
              },
            ],
          }}
          trigger={['click']}
        >
          <div
            style={{
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 14,
              border: '1px solid #edf0f3',
              background: '#fff',
            }}
          >
            <Avatar style={{ background: accent }} icon={<UserOutlined />} />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <Text strong style={{ fontSize: 13 }}>
                {userName}
              </Text>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {userRole}
              </Text>
            </div>
          </div>
        </Dropdown>
      </Space>
    </Header>
  )
}

function getTenantSelectedKey(pathname: string) {
  if (pathname === '/') return '/'
  if (pathname.startsWith('/documents')) return '/documents'
  if (pathname.startsWith('/document-types')) return '/document-types'
  if (pathname.startsWith('/workflows')) return '/workflows'
  if (pathname.startsWith('/ld')) return '/ld'
  if (pathname.startsWith('/tasks')) return '/tasks'
  if (pathname.startsWith('/users')) return '/users'
  if (pathname.startsWith('/metadata')) return '/metadata'
  if (pathname.startsWith('/organization')) return '/organization'
  if (pathname.startsWith('/environment-settings')) return '/environment-settings'
  return '/'
}

function getPlatformSelectedKey(pathname: string) {
  if (pathname.startsWith('/platform/admins')) return '/platform/admins'
  return '/platform'
}

function PlatformLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const platformAdmin = useAuthStore(s => s.platformAdmin)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // ignore
    }
    clearAuth()
    navigate('/login')
  }

  const menuItems = useMemo(
    () => [
      {
        type: 'group' as const,
        label: 'PLATAFORMA',
        children: [
          {
            key: '/platform',
            label: <Link to="/platform">Tenants</Link>,
            icon: <GlobalOutlined />,
          },
          {
            key: '/platform/admins',
            label: <Link to="/platform/admins">Admins</Link>,
            icon: <SettingOutlined />,
          },
        ],
      },
    ],
    []
  )

  const selectedKey = getPlatformSelectedKey(location.pathname)

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Sider
        width={272}
        collapsedWidth={88}
        collapsed={collapsed}
        trigger={null}
        style={{
          background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)',
          boxShadow: '6px 0 24px rgba(15, 23, 42, 0.12)',
          overflow: 'hidden',
        }}
      >
        <SidebarBrand
          collapsed={collapsed}
          title="Plataforma"
          subtitle="Painel administrativo"
          tagText="Super Admin"
          accent="#faad14"
        />

        <div style={{ padding: 12 }}>
          <Menu
            theme="dark"
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{
              background: 'transparent',
              border: 'none',
            }}
          />
        </div>

        <div style={{ marginTop: 'auto' }}>
          <SidebarUserCard
            collapsed={collapsed}
            name={platformAdmin?.name}
            role="Administrador da Plataforma"
            accent="#faad14"
          />
        </div>
      </Sider>

      <Layout>
        <Topbar
          collapsed={collapsed}
          onToggle={() => setCollapsed(prev => !prev)}
          userName={platformAdmin?.name}
          userRole="Plataforma"
          onLogout={handleLogout}
          accent="#faad14"
        />

        <Content style={{ padding: 24 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: 24,
              minHeight: 'calc(100vh - 120px)',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Routes>
              <Route index element={<TenantsPage />} />
              <Route path="admins" element={<PlatformAdminsPage />} />
              <Route path="tenants/:id/users" element={<TenantUsersPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuthStore(s => s.user)
  const enabledModules = useAuthStore(s => s.enabledModules)
  const clearAuth = useAuthStore(s => s.clearAuth)
  const [collapsed, setCollapsed] = useState(false)

  const has = (module: string) => enabledModules.includes(module)

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // ignore
    }
    clearAuth()
    navigate('/login')
  }

  const menuItems = useMemo(
    () => [
      {
        type: 'group' as const,
        label: 'OPERACIONAL',
        children: [
          {
            key: '/',
            label: <Link to="/">Dashboard</Link>,
            icon: <DashboardOutlined />,
          },
          {
            key: '/documents',
            label: <Link to="/documents">Documentos</Link>,
            icon: <FolderOpenOutlined />,
          },
          {
            key: '/ld',
            label: <Link to="/ld">LD</Link>,
            icon: <UnorderedListOutlined />,
          },
          {
            key: '/tasks',
            label: <Link to="/tasks">Minhas Tarefas</Link>,
            icon: <CheckSquareOutlined />,
          },
        ],
      },
      {
        type: 'group' as const,
        label: 'CONFIGURAÇÃO',
        children: [
          ...(has('document_types')
            ? [
              {
                key: '/document-types',
                label: <Link to="/document-types">Tipos de Doc.</Link>,
                icon: <FileOutlined />,
              },
            ]
            : []),
          ...(has('workflows')
            ? [
              {
                key: '/workflows',
                label: <Link to="/workflows">Workflows</Link>,
                icon: <ApartmentOutlined />,
              },
            ]
            : []),
          ...(has('metadata')
            ? [
              {
                key: '/metadata',
                label: <Link to="/metadata">Metadados</Link>,
                icon: <DatabaseOutlined />,
              },
            ]
            : []),
          ...(has('organization')
            ? [
              {
                key: '/organization',
                label: <Link to="/organization">Organização</Link>,
                icon: <TeamOutlined />,
              },
            ]
            : []),
          ...(user?.role === 'Admin'
            ? [
              {
                key: '/environment-settings',
                label: <Link to="/environment-settings">Config. Ambiente</Link>,
                icon: <SettingOutlined />,
              },
            ]
            : []),
          ...(has('users') && user?.role === 'Admin'
            ? [
              {
                key: '/users',
                label: <Link to="/users">Usuários</Link>,
                icon: <UserOutlined />,
              },
            ]
            : []),
        ],
      },
    ],
    [enabledModules, user?.role]
  )

  const selectedKey = getTenantSelectedKey(location.pathname)

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Sider
        width={280}
        collapsedWidth={88}
        collapsed={collapsed}
        trigger={null}
        style={{
          background: 'linear-gradient(180deg, #0b1f3a 0%, #102a43 100%)',
          boxShadow: '6px 0 24px rgba(16, 42, 67, 0.14)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SidebarBrand
          collapsed={collapsed}
          title={user?.tenantName ?? 'Gestão de Docs'}
          subtitle="Gestão de Documentos"
          tagText={user?.role ?? 'Usuário'}
          accent="#1677ff"
        />

        <div style={{ padding: 12, flex: 1 }}>
          <Menu
            theme="dark"
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[selectedKey]}
            items={menuItems}
            style={{
              background: 'transparent',
              border: 'none',
            }}
          />
        </div>

        {!collapsed && (
          <div style={{ paddingInline: 16 }}>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.08)', margin: '4px 0 10px' }} />
          </div>
        )}

        <SidebarUserCard
          collapsed={collapsed}
          name={user?.name}
          role={user?.role}
          accent="#1677ff"
        />
      </Sider>

      <Layout>
        <Topbar
          collapsed={collapsed}
          onToggle={() => setCollapsed(prev => !prev)}
          userName={user?.name}
          userRole={user?.role}
          onLogout={handleLogout}
          accent="#1677ff"
        />

        <Content style={{ padding: 24 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 24,
              padding: 24,
              minHeight: 'calc(100vh - 120px)',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
            }}
          >
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/documents/new" element={<DocumentNewPage />} />
              <Route path="/documents/:id" element={<DocumentDetailPage />} />
              <Route path="/document-types" element={<DocumentTypesPage />} />
              <Route path="/workflows" element={<WorkflowsPage />} />
              <Route path="/workflows/new" element={<WorkflowNewPage />} />
              <Route path="/workflows/designer" element={<WorkflowDesignerPage />} />
              <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
              <Route path="/workflows/:id/edit" element={<WorkflowEditPage />} />
              <Route path="/ld" element={<LDPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/metadata" element={<MetadataPage />} />
              <Route path="/organization" element={<OrganizationPage />} />
              <Route path="/environment-settings" element={<EnvironmentSettingsPage />} />
              <Route path="/notifications" element={<NotificationTemplatesPage />} />
              <Route path="/workflows/:id/studio" element={<WorkflowStudioPage />} />
              <Route path="/workflows/:id/edit" element={<WorkflowStudioPage />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/platform/*"
        element={
          <ProtectedRoute requirePlatformAdmin>
            <PlatformLayout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}