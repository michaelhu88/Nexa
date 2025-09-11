import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { Users, Shield, Settings, Activity, Database, Globe } from 'lucide-react'

function Dashboard() {
  const stats = [
    { label: 'Total Users', value: '2,543', change: '+12%', icon: Users },
    { label: 'Active Sessions', value: '423', change: '+5%', icon: Activity },
    { label: 'System Health', value: '98%', change: '+2%', icon: Database },
    { label: 'Global Regions', value: '12', change: '0%', icon: Globe }
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-8 h-8 text-yellow-500" />
              <span className="text-sm text-green-600 font-medium">{stat.change}</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">System Overview</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">Database Status</span>
            <span className="text-green-600 font-medium">Operational</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">API Response Time</span>
            <span className="text-yellow-600 font-medium">142ms</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b">
            <span className="text-gray-600">Storage Used</span>
            <span className="text-gray-900 font-medium">67% of 500GB</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-600">Last Backup</span>
            <span className="text-gray-900 font-medium">2 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function UserManagement() {
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Manager', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'Inactive' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Manager', status: 'Active' },
    { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'User', status: 'Active' }
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">User Management</h2>
          <button className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
            Add User
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                  <button className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Permissions() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold mb-4">Permission Management</h2>
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">Admin Role</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Full System Access</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">User Management</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">System Configuration</span>
            </label>
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-3">Manager Role</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Department Access</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              <span className="text-sm">Report Generation</span>
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              <span className="text-sm">User Management</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

function SystemSettings() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">General Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input
              type="text"
              defaultValue="Enterprise Corp"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">System Email</label>
            <input
              type="email"
              defaultValue="admin@enterprise.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Zone</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500">
              <option>UTC-8 (Pacific Time)</option>
              <option>UTC-5 (Eastern Time)</option>
              <option>UTC+0 (GMT)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">Security Settings</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Two-Factor Authentication</span>
            <input type="checkbox" className="toggle" defaultChecked />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Session Timeout (30 min)</span>
            <input type="checkbox" className="toggle" defaultChecked />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Password Complexity Requirements</span>
            <input type="checkbox" className="toggle" defaultChecked />
          </label>
        </div>
      </div>

      <button className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors">
        Save Settings
      </button>
    </div>
  )
}

export default function FullView() {
  return (
    <Layout title="Full View - Admin Dashboard">
      <div className="flex gap-6">
        <nav className="w-64 bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-fit">
          <ul className="space-y-2">
            <li>
              <NavLink
                to="/full-view"
                end
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-yellow-50 text-yellow-600' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Activity className="w-5 h-5" />
                <span>Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/full-view/users"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-yellow-50 text-yellow-600' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Users className="w-5 h-5" />
                <span>Users</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/full-view/permissions"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-yellow-50 text-yellow-600' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Shield className="w-5 h-5" />
                <span>Permissions</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/full-view/settings"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-yellow-50 text-yellow-600' : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/permissions" element={<Permissions />} />
            <Route path="/settings" element={<SystemSettings />} />
            <Route path="*" element={<Navigate to="/full-view" replace />} />
          </Routes>
        </div>
      </div>
    </Layout>
  )
}