/**
 * Admin Dashboard
 * 
 * Analytics and monitoring dashboard for administrators.
 * Displays comprehensive statistics about rations, feed usage, performance, and system health.
 * 
 * Privacy: All data is sourced from localStorage (local browser storage).
 * No data is collected or sent to any server.
 */

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Package, Activity, Download, RefreshCw } from 'lucide-react'
import {
  getRationStats,
  getFeedUsageStats,
  getPerformanceStats,
  getSystemHealth,
  exportAnalyticsData,
  type RationStats,
  type FeedUsageStats,
  type PerformanceStats,
  type SystemHealth,
} from '@/utils/adminAnalytics'

export default function AdminDashboard() {
  const [rationStats, setRationStats] = useState<RationStats | null>(null)
  const [feedStats, setFeedStats] = useState<FeedUsageStats | null>(null)
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = () => {
    setRefreshing(true)
    try {
      setRationStats(getRationStats())
      setFeedStats(getFeedUsageStats())
      setPerformanceStats(getPerformanceStats())
      setSystemHealth(getSystemHealth())
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleExport = () => {
    const json = exportAnalyticsData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-analytics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-purple-600" />
              Admin Dashboard
            </h1>
            <p className="mt-2 text-gray-600">
              Comprehensive analytics and system monitoring
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Rations */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Rations</h3>
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{rationStats?.total || 0}</p>
          <p className="mt-2 text-sm text-gray-600">
            {rationStats?.last7Days || 0} in last 7 days
          </p>
        </div>

        {/* Feed Usage */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Total Feeds</h3>
            <Package className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{feedStats?.totalFeeds || 0}</p>
          <p className="mt-2 text-sm text-gray-600">
            {feedStats?.customFeeds || 0} custom feeds
          </p>
        </div>

        {/* Evaluations */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">Evaluations</h3>
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{performanceStats?.evaluationsCount || 0}</p>
          <p className="mt-2 text-sm text-gray-600">
            {formatPercent(performanceStats?.successRate || 0)} success rate
          </p>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-600">System Health</h3>
            <Activity className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {systemHealth ? formatPercent((systemHealth.storageUsed / systemHealth.storageLimit) * 100) : '0%'}
          </p>
          <p className="mt-2 text-sm text-gray-600">Storage used</p>
        </div>
      </div>

      {/* Charts and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Animal Type Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rations by Animal Type</h3>
          {rationStats?.byAnimalType && Object.keys(rationStats.byAnimalType).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(rationStats.byAnimalType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 capitalize">{type}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-600 rounded-full"
                        style={{ width: `${(count / (rationStats.total || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>

        {/* Purpose Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Rations by Purpose</h3>
          {rationStats?.byPurpose && Object.keys(rationStats.byPurpose).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(rationStats.byPurpose).map(([purpose, count]) => (
                <div key={purpose} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 capitalize">{purpose}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 rounded-full"
                        style={{ width: `${(count / (rationStats.total || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data available</p>
          )}
        </div>
      </div>

      {/* Most Used Feeds */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Used Feeds (Top 10)</h3>
        {feedStats?.mostUsed && feedStats.mostUsed.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feed Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage Count
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {feedStats.mostUsed.map((feed, index) => (
                  <tr key={feed.feedId}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {feed.feedName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {feed.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-purple-600">
                      {feed.usageCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No feed usage data available</p>
        )}
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
          <h4 className="text-sm font-medium text-purple-900 mb-2">Avg Cost/Day</h4>
          <p className="text-2xl font-bold text-purple-900">
            ₺{rationStats?.avgCost.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
          <h4 className="text-sm font-medium text-green-900 mb-2">Avg Protein</h4>
          <p className="text-2xl font-bold text-green-900">
            {rationStats?.avgProtein.toFixed(0) || '0'} g/day
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Avg Energy</h4>
          <p className="text-2xl font-bold text-blue-900">
            {rationStats?.avgEnergy.toFixed(1) || '0.0'} Mcal/day
          </p>
        </div>
      </div>

      {/* 30-Day Trend */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">30-Day Ration Creation Trend</h3>
        {performanceStats?.trendsOverTime && performanceStats.trendsOverTime.length > 0 ? (
          <div className="h-64 flex items-end gap-1">
            {performanceStats.trendsOverTime.map((point, index) => {
              const maxCount = Math.max(...performanceStats.trendsOverTime.map(p => p.count), 1)
              const height = (point.count / maxCount) * 100
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-purple-600 rounded-t hover:bg-purple-700 transition-colors cursor-pointer"
                    style={{ height: `${height}%`, minHeight: point.count > 0 ? '4px' : '0' }}
                    title={`${point.date}: ${point.count} rations`}
                  />
                  {index % 5 === 0 && (
                    <span className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                      {new Date(point.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No trend data available</p>
        )}
      </div>

      {/* System Health Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Details</h3>
        {systemHealth ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Storage Used</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {formatBytes(systemHealth.storageUsed)} / {formatBytes(systemHealth.storageLimit)}
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Rations</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{systemHealth.rationCount}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Feeds</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{systemHealth.feedCount}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">Inventory Lots</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{systemHealth.inventoryLots}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg col-span-2">
              <p className="text-sm text-gray-600">Last Backup</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {systemHealth.lastBackup || 'Never'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">Loading system health...</p>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-900">
          <strong>Privacy Notice:</strong> All data displayed on this dashboard is sourced from your local browser storage (localStorage).
          No data is collected, transmitted, or stored on any server. All analytics are computed locally in your browser.
        </p>
      </div>
    </div>
  )
}
