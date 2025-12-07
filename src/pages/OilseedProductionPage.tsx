import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { translateCountry } from '../utils/countryTranslations'

// Yağlı Tohum ürün kodları - FAO
const PRODUCTS = [
  { id: '236', nameTR: 'Soya Fasulyesi' },
  { id: '267', nameTR: 'Ayçiçeği' },
  { id: '270', nameTR: 'Kolza (Kanola)' },
  { id: '242', nameTR: 'Yer Fıstığı' },
  { id: '289', nameTR: 'Susam' },
  { id: '260', nameTR: 'Zeytin' },
  { id: '249', nameTR: 'Hindistan Cevizi' },
  { id: '254', nameTR: 'Palm Yağı' },
  { id: '280', nameTR: 'Aspir' },
  { id: '333', nameTR: 'Keten Tohumu' },
]

const COLORS = ['#FFD700', '#FFA500', '#FF8C00', '#DAA520', '#B8860B', '#CD853F', '#D2691E', '#8B4513', '#A0522D', '#8B0000']

// API config
const API_BASE = 'https://dersbende.com/api.php'
const API_KEY = 'dashboard_secret_key_2024'

interface ProductionData {
  country: string
  production: number
  year: number
  [key: string]: string | number
}

interface TrendData {
  year: number
  production: number
}

interface ComparisonData {
  name: string
  value: number
}

const formatTon = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)} Milyar ton`
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)} Milyon ton`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} Bin ton`
  }
  return `${value.toFixed(0)} ton`
}

const formatTonShort = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toFixed(0)
}

export default function OilseedProductionPage() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0].id)
  const [selectedYear, setSelectedYear] = useState('2022')
  const [productionData, setProductionData] = useState<ProductionData[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([])
  const [loading, setLoading] = useState(true)
  const [years, setYears] = useState<string[]>([])

  // Yılları getir
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const productIds = PRODUCTS.map(p => p.id).join(',')
        const sql = `SELECT DISTINCT yilkod FROM fao_uretim WHERE urunkod IN (${productIds}) ORDER BY yilkod DESC`
        const response = await fetch(`${API_BASE}?action=query&api_key=${API_KEY}&sql=${encodeURIComponent(sql)}`)
        const data = await response.json()
        if (data.data) {
          const yearList = data.data.map((row: { yilkod: number }) => row.yilkod.toString())
          setYears(yearList)
          if (yearList.length > 0) {
            setSelectedYear(yearList[0])
          }
        }
      } catch (error) {
        console.error('Yıl verisi hatası:', error)
      }
    }
    fetchYears()
  }, [])

  // Ülke bazlı üretim verilerini getir
  useEffect(() => {
    const fetchProductionData = async () => {
      setLoading(true)
      try {
        const sql = `
          SELECT f.ulkekod, n.area as country_name, SUM(f.uretim_deger) as toplam
          FROM fao_uretim f
          LEFT JOIN fao_nufus n ON f.ulkekod = n.areacode
          WHERE f.urunkod = ${selectedProduct} AND f.yilkod = ${selectedYear}
          GROUP BY f.ulkekod, n.area
          ORDER BY toplam DESC
          LIMIT 15
        `
        const response = await fetch(`${API_BASE}?action=query&api_key=${API_KEY}&sql=${encodeURIComponent(sql)}`)
        const data = await response.json()
        
        if (data.data) {
          const formattedData = data.data.map((row: { country_name: string; ulkekod: number; toplam: string }) => ({
            country: translateCountry(row.country_name || `Ülke ${row.ulkekod}`),
            production: parseFloat(row.toplam) || 0,
            year: parseInt(selectedYear)
          }))
          setProductionData(formattedData)
        }
      } catch (error) {
        console.error('Üretim verisi hatası:', error)
      }
      setLoading(false)
    }
    
    if (selectedYear) {
      fetchProductionData()
    }
  }, [selectedProduct, selectedYear])

  // Trend verilerini getir
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        const sql = `
          SELECT yilkod, SUM(uretim_deger) as toplam
          FROM fao_uretim
          WHERE urunkod = ${selectedProduct}
          GROUP BY yilkod
          ORDER BY yilkod
        `
        const response = await fetch(`${API_BASE}?action=query&api_key=${API_KEY}&sql=${encodeURIComponent(sql)}`)
        const data = await response.json()
        
        if (data.data) {
          const formattedData = data.data.map((row: { yilkod: number; toplam: string }) => ({
            year: parseInt(row.yilkod.toString()),
            production: parseFloat(row.toplam) || 0
          }))
          setTrendData(formattedData)
        }
      } catch (error) {
        console.error('Trend verisi hatası:', error)
      }
    }
    fetchTrendData()
  }, [selectedProduct])

  // Ürün karşılaştırma verilerini getir
  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        const productIds = PRODUCTS.map(p => p.id).join(',')
        const sql = `
          SELECT urunkod, SUM(uretim_deger) as toplam
          FROM fao_uretim
          WHERE urunkod IN (${productIds}) AND yilkod = ${selectedYear}
          GROUP BY urunkod
          ORDER BY toplam DESC
        `
        const response = await fetch(`${API_BASE}?action=query&api_key=${API_KEY}&sql=${encodeURIComponent(sql)}`)
        const data = await response.json()
        
        if (data.data) {
          const formattedData = data.data.map((row: { urunkod: number; toplam: string }) => {
            const product = PRODUCTS.find(p => p.id === row.urunkod.toString())
            return {
              name: product?.nameTR || `Ürün ${row.urunkod}`,
              value: parseFloat(row.toplam) || 0
            }
          })
          setComparisonData(formattedData)
        }
      } catch (error) {
        console.error('Karşılaştırma verisi hatası:', error)
      }
    }
    
    if (selectedYear) {
      fetchComparisonData()
    }
  }, [selectedYear])

  const selectedProductName = PRODUCTS.find(p => p.id === selectedProduct)?.nameTR || ''
  const totalProduction = productionData.reduce((sum, item) => sum + item.production, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">🌻 Yağlı Tohum Üretimi</h1>
        <p className="opacity-90">FAO verileriyle dünya yağlı tohum üretim istatistikleri (Ton)</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ürün Seçin</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              {PRODUCTS.map(product => (
                <option key={product.id} value={product.id}>{product.nameTR}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Yıl Seçin</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-yellow-500 text-2xl mb-2">🌻</div>
          <div className="text-sm text-gray-500">Seçili Ürün</div>
          <div className="text-xl font-bold text-gray-800">{selectedProductName}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-green-500 text-2xl mb-2">🌍</div>
          <div className="text-sm text-gray-500">Toplam Üretim</div>
          <div className="text-xl font-bold text-gray-800">{formatTon(totalProduction)}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-blue-500 text-2xl mb-2">🏆</div>
          <div className="text-sm text-gray-500">En Büyük Üretici</div>
          <div className="text-xl font-bold text-gray-800">{productionData[0]?.country || '-'}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="text-purple-500 text-2xl mb-2">📅</div>
          <div className="text-sm text-gray-500">Seçili Yıl</div>
          <div className="text-xl font-bold text-gray-800">{selectedYear}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
        </div>
      ) : (
        <>
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                🏆 {selectedProductName} - En Büyük Üreticiler ({selectedYear})
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={productionData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={formatTonShort} />
                  <YAxis dataKey="country" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatTon(value)} />
                  <Bar dataKey="production" fill="#FFD700" name="Üretim" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                📊 {selectedProductName} - Üretim Dağılımı
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={productionData.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    outerRadius={130}
                    fill="#8884d8"
                    dataKey="production"
                    nameKey="country"
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                  >
                    {productionData.slice(0, 8).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatTon(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                📈 {selectedProductName} - Dünya Üretim Trendi
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={formatTonShort} />
                  <Tooltip formatter={(value: number) => formatTon(value)} />
                  <Area type="monotone" dataKey="production" stroke="#FFD700" fill="#FFF8DC" name="Üretim" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Product Comparison */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">
                🌻 Yağlı Tohum Türleri Karşılaştırması ({selectedYear})
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tickFormatter={formatTonShort} />
                  <Tooltip formatter={(value: number) => formatTon(value)} />
                  <Bar dataKey="value" name="Üretim" radius={[4, 4, 0, 0]}>
                    {comparisonData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              📋 {selectedProductName} - Detaylı Üretim Verileri ({selectedYear})
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-yellow-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sıra</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ülke</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Üretim (Ton)</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dünya Payı</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productionData.map((item, index) => (
                    <tr key={index} className="hover:bg-yellow-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.country}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatTon(item.production)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {totalProduction > 0 ? ((item.production / totalProduction) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
