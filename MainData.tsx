import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/MainData.css';

// 添加高德地图类型声明
declare global {
  interface Window {
    AMap: any;
  }
}

interface User {
  username: string;
  role: string;
}

interface HydroData {
  id: number;
  location: string;
  date: string;
  water_temperature: number;
  pH: number;
  dissolved_oxygen: number;
  conductivity: number;
  turbidity: number;
  permanganate_index: number;
  ammonia_nitrogen: number;
  total_phosphorus: number;
  total_nitrogen: number;
  site_condition: string;
}

interface HistoryData {
  date: string;
  value: number;
}

interface DeviceStats {
  name: string;
  value: number;
}

interface ControlState {
  camera: boolean;
  light: boolean;
  cleaner: boolean;
  monitor: boolean;  // 水质监测系统
  feeder: boolean;   // 投喂系统
  environment: boolean;  // 环境调节系统
}

interface MapEvent {
  lnglat: {
    getLng: () => number;
    getLat: () => number;
  };
}

// 添加天气数据接口
interface WeatherData {
  date: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  weather: string;
  weatherIcon: string;
}

// 固定的水文数据（初始值）
const fixedHydroData: HydroData[] = [
  {
    id: 1,
    location: '海洋牧场A区',
    date: '2024-06-01',
    water_temperature: 27.5,
    pH: 8.1,
    dissolved_oxygen: 6.8,
    conductivity: 3200,
    turbidity: 0.7,
    permanganate_index: 1.2,
    ammonia_nitrogen: 0.02,
    total_phosphorus: 0.01,
    total_nitrogen: 0.5,
    site_condition: '良好'
  }
];

// 合理的波动范围
const HYDRO_FLUCTUATION = {
  water_temperature: { min: -0.2, max: 0.2 },
  pH: { min: -0.1, max: 0.1 },
  dissolved_oxygen: { min: -0.3, max: 0.3 },
  conductivity: { min: -10, max: 10 },
  turbidity: { min: -0.1, max: 0.1 },
  ammonia_nitrogen: { min: -0.002, max: 0.002 }
};

function getFluctuatedHydroData(data: HydroData[]): HydroData[] {
  if (!Array.isArray(data) || data.length === 0) return data;
  return data.map(d => ({
    ...d,
    water_temperature: parseFloat(Math.max(0, (d.water_temperature + (Math.random() * (HYDRO_FLUCTUATION.water_temperature.max - HYDRO_FLUCTUATION.water_temperature.min) + HYDRO_FLUCTUATION.water_temperature.min))).toFixed(1)),
    pH: parseFloat(Math.max(0, (d.pH + (Math.random() * (HYDRO_FLUCTUATION.pH.max - HYDRO_FLUCTUATION.pH.min) + HYDRO_FLUCTUATION.pH.min))).toFixed(2)),
    dissolved_oxygen: parseFloat(Math.max(0, (d.dissolved_oxygen + (Math.random() * (HYDRO_FLUCTUATION.dissolved_oxygen.max - HYDRO_FLUCTUATION.dissolved_oxygen.min) + HYDRO_FLUCTUATION.dissolved_oxygen.min))).toFixed(2)),
    conductivity: parseFloat(Math.max(0, (d.conductivity + (Math.random() * (HYDRO_FLUCTUATION.conductivity.max - HYDRO_FLUCTUATION.conductivity.min) + HYDRO_FLUCTUATION.conductivity.min))).toFixed(0)),
    turbidity: parseFloat(Math.max(0, (d.turbidity + (Math.random() * (HYDRO_FLUCTUATION.turbidity.max - HYDRO_FLUCTUATION.turbidity.min) + HYDRO_FLUCTUATION.turbidity.min))).toFixed(2)),
    ammonia_nitrogen: parseFloat(Math.max(0, (d.ammonia_nitrogen + (Math.random() * (HYDRO_FLUCTUATION.ammonia_nitrogen.max - HYDRO_FLUCTUATION.ammonia_nitrogen.min) + HYDRO_FLUCTUATION.ammonia_nitrogen.min))).toFixed(3))
  }));
}

// 固定的设备状态
const fixedDeviceStats: DeviceStats[] = [
  { name: '设备电量', value: 95 },
  { name: '信号强度', value: 80 },
  { name: 'CPU温度', value: 45 },
  { name: '内存占用', value: 60 }
];

const MainData = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}') as User;
  // 水文数据动态
  const [hydroData, setHydroData] = useState<HydroData[]>(fixedHydroData);
  // 设备状态动态
  const [deviceStats, setDeviceStats] = useState<DeviceStats[]>([]);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [selectedDataType, setSelectedDataType] = useState('water_temperature');
  const [selectedDays, setSelectedDays] = useState(7);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [controlState, setControlState] = useState<ControlState>({
    camera: false,
    light: false,
    cleaner: false,
    monitor: false,
    feeder: false,
    environment: false
  });
  const FLUCTUATION_RANGE = {
    water_temperature: { min: -0.2, max: 0.2 },    // 水温波动范围 ±0.2℃
    pH: { min: -0.5, max: 0.5 },                 // pH值波动范围 ±0.5
    dissolved_oxygen: { min: -2, max: 2 },     // 溶解氧波动 ±2mg/L
    conductivity: { min: -20, max: 20 },             // 电导率波动 ±20μS/cm
    turbidity: { min: -0.5, max: 0.5 },            // 浊度波动 ±0.5NTU
    ammonia_nitrogen: { min: -0.001, max: 0.001 }    // 氨氮波动 ±0.001mg/L
  };

  // 水文数据定时波动
  useEffect(() => {
      const interval = setInterval(() => {
      setHydroData(prev => getFluctuatedHydroData(prev));
    }, 30000); // 1分钟
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 获取历史水文数据
    const fetchHistoryData = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/hydro-data/history?days=${selectedDays}&type=${selectedDataType}`);
        // 对数据进行采样，根据天数决定采样间隔
        const sampleInterval = selectedDays <= 7 ? 2 : selectedDays <= 30 ? 5 : 10;
        const sampledData = response.data.filter((_: any, index: number) => index % sampleInterval === 0);
        setHistoryData(sampledData);
      } catch (error) {
        console.error('Error fetching history data:', error);
      }
    };

    fetchHistoryData();
  }, [selectedDataType, selectedDays]);

  useEffect(() => {
    // 获取天气数据
    const fetchWeatherData = async () => {
      try {
        // 使用和风天气API获取三亚市的15天天气数据
        const response = await axios.get(
          `https://devapi.qweather.com/v7/weather/15d?location=101310201&key=YOUR_API_KEY`
        );

        if (response.data.code === '200') {
          const weatherData = response.data.daily.map((day: any) => ({
            date: day.fxDate,
            temperature: parseInt(day.tempMax),
            humidity: parseInt(day.humidity),
            windSpeed: parseInt(day.windSpeedDay),
            weather: day.textDay,
            weatherIcon: day.iconDay
          }));
          setWeatherData(weatherData);
        }
      } catch (error) {
        console.error('Error fetching weather data:', error);
        // 如果API调用失败，使用备用数据
        const fallbackData = Array.from({ length: 15 }, (_, i) => ({
          date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
          temperature: Math.floor(Math.random() * 5) + 25, // 25-30度之间
          humidity: Math.floor(Math.random() * 10) + 70, // 70-80%之间
          windSpeed: Math.floor(Math.random() * 3) + 3, // 3-6m/s之间
          weather: ['晴', '多云', '小雨'][Math.floor(Math.random() * 3)],
          weatherIcon: ['100', '101', '305'][Math.floor(Math.random() * 3)]
        }));
        setWeatherData(fallbackData);
      }
    };

    fetchWeatherData();
  }, []);

  // 恢复设备状态动态获取
  useEffect(() => {
    // 获取设备状态数据
    const fetchDeviceStats = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/device-stats');
        setDeviceStats(response.data);
      } catch (error) {
        console.error('Error fetching device stats:', error);
      }
    };
    fetchDeviceStats();
    // 每60秒更新一次设备状态
    const interval = setInterval(fetchDeviceStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // 检查是否已加载过高德地图脚本
    const scriptId = 'amap-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    let scriptLoaded = false;
    let scriptError = false;

    const initMap = () => {
      try {
        if (window.AMap) {
          const map = new window.AMap.Map('container', {
            zoom: 13,
            center: [109.579, 18.2977],
            viewMode: '3D',
            layers: [new window.AMap.TileLayer.Satellite()],
            mapStyle: 'amap://styles/light',
            features: ['bg', 'road', 'building', 'point'],
            pitch: 50,
            backgroundColor: 'transparent'
          });
          try {
            map.addControl(new window.AMap.Scale({ position: 'RB' }));
          } catch (e) { console.warn('Scale控件加载失败', e); }
          try {
            map.addControl(new window.AMap.ToolBar({ position: 'RB' }));
          } catch (e) { console.warn('ToolBar控件加载失败', e); }
          // 异步加载HawkEye控件
          try {
            window.AMap.plugin(['AMap.HawkEye'], function () {
              if (window.AMap.HawkEye) {
                try {
                  map.addControl(new window.AMap.HawkEye({
                    isOpen: true,
                    position: 'RB'
                  }));
                } catch (e) {
                  console.warn('HawkEye控件加载失败', e);
                }
              } else {
                console.warn('HawkEye插件未挂载');
              }
            });
          } catch (e) { console.warn('HawkEye插件加载异常', e); }
          try {
            map.addControl(new window.AMap.MapType({ position: 'RT' }));
          } catch (e) { console.warn('MapType控件加载失败', e); }
          // 标记点和信息窗体
          try {
            const marker = new window.AMap.Marker({
              position: [109.579, 18.2977],
              title: '海洋牧场位置',
              animation: 'AMAP_ANIMATION_DROP',
              icon: new window.AMap.Icon({
                size: new window.AMap.Size(40, 40),
                image: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
                imageSize: new window.AMap.Size(40, 40)
              })
            });
            const infoWindow = new window.AMap.InfoWindow({
              content: `
                <div style="padding:10px;color:#333;">
                  <h4 style="margin:0 0 10px 0;color:#1890ff;">海洋牧场</h4>
                  <p style="margin:5px 0;">面积：5000亩</p>
                  <p style="margin:5px 0;">养殖品种：海带、扇贝、海参</p>
                  <p style="margin:5px 0;">地址：海南省三亚市天涯区</p>
                </div>
              `,
              offset: new window.AMap.Pixel(0, -30)
            });
            marker.on('click', () => {
              infoWindow.open(map, marker.getPosition());
            });
            map.add(marker);
            map.on('click', (e: MapEvent) => {
              console.log('地图点击位置：', e.lnglat);
            });
          } catch (e) { console.warn('Marker或InfoWindow加载失败', e); }
        }
      } catch (e) {
        console.error('高德地图初始化异常', e);
      }
    };

    const handleScriptLoad = () => {
      scriptLoaded = true;
      if (window.AMap) {
        initMap();
      }
    };
    const handleScriptError = () => {
      scriptError = true;
      console.error('高德地图脚本加载失败');
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://webapi.amap.com/maps?v=2.0&key=07d5026f50f245d70915345fc69e330a&plugin=AMap.Scale,AMap.ToolBar,AMap.HawkEye,AMap.MapType,AMap.Geocoder`;
      script.async = true;
      script.onload = handleScriptLoad;
      script.onerror = handleScriptError;
      document.head.appendChild(script);
    } else if (window.AMap) {
      // 已经加载过脚本且AMap已挂载
      initMap();
    } else {
      // 脚本已存在但未加载完成，监听onload
      script.onload = handleScriptLoad;
      script.onerror = handleScriptError;
    }

    return () => {
      // 清理地图实例
      if (window.AMap) {
        const map = document.getElementById('container');
        if (map) {
          map.innerHTML = '';
        }
      }
      // 移除脚本，防止冲突（可选）
      // if (script) document.head.removeChild(script);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleNavClick = (page: string) => {
    switch (page) {
      case 'main':
        navigate('/dashboard');
        break;
      case 'underwater':
        navigate('/underwater-system');
        break;
      case 'data':
        navigate('/datacenter');
        break;
      case 'ai':
        // 后续实现智能中心页面跳转
        navigate('/intelligence');
        break;
    }
  };

  const handleControlToggle = (device: keyof ControlState) => {
    setControlState(prev => ({
      ...prev,
      [device]: !prev[device]
    }));
  };

  return (
    <div className="dashboard">
      <div className="ocean-background">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>

      <header className="dashboard-header">
        <div className="header-content">
          <h1>海洋牧场智慧可视化系统</h1>
          <div className="nav-buttons">
            <button
              className="nav-button active"
              onClick={() => handleNavClick('main')}
            >
              主要信息
            </button>
            <button
              className="nav-button"
              onClick={() => handleNavClick('underwater')}
            >
              水下系统
            </button>
            <button
              className="nav-button"
              onClick={() => handleNavClick('data')}
            >
              数据中心
            </button>
            <button
              className="nav-button"
              onClick={() => handleNavClick('ai')}
            >
              智能中心
            </button>
          </div>
          <div className="user-info">
            <span>欢迎, {user.username}</span>
            <span className="user-role">({user.role === 'admin' ? '管理员' : '普通用户'})</span>
            <button onClick={handleLogout} className="logout-button">退出</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-title">
          <h2>主要信息界面</h2>
          <p className="subtitle">海洋牧场实时监测与数据展示</p>
        </div>

        <div className="dashboard-grid">
          {/* 第一行：天气图表 + 海洋牧场展示 */}
          <div className="dashboard-card weather-card">
            <div className="card-header">
              <h2>海洋牧场天气</h2>
              <div className="card-icon">🌤️</div>
            </div>
            <div className="weather-container">
              <div className="current-weather">
                <div className="weather-main">
                  <span className="temperature">{weatherData[0]?.temperature}°C</span>
                  <span className="weather">{weatherData[0]?.weather}</span>
                </div>
                <div className="weather-details">
                  <div className="detail-item">
                    <span className="label">湿度</span>
                    <span className="value">{weatherData[0]?.humidity}%</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">风速</span>
                    <span className="value">{weatherData[0]?.windSpeed}m/s</span>
                  </div>
                </div>
              </div>
              <div className="weather-chart">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weatherData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(date) => date.split('-')[2]}
                      stroke="rgba(255,255,255,0.7)"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis stroke="rgba(255,255,255,0.7)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="temperature"
                      stroke="#ff9800"
                      name="温度"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="humidity"
                      stroke="#4fc3f7"
                      name="湿度"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="dashboard-card location-card">
            <div className="card-header">
              <h2>海洋牧场位置</h2>
              <div className="card-icon">📍</div>
            </div>
            <div className="map-container">
              <div id="container" className="map-frame"></div>
              <div className="location-info">
                <div className="info-item">
                  <span className="label">经度</span>
                  <span className="value">109°45'79"E</span>
                </div>
                <div className="info-item">
                  <span className="label">纬度</span>
                  <span className="value">18°29'77"N</span>
                </div>
              </div>
            </div>
          </div>

          {/* 第二行：水文数据 + 历史数据 */}
          <div className="dashboard-card hydro-card">
            <div className="card-header">
              <h2>实时水文数据</h2>
              <div className="card-icon">🌊</div>
            </div>
            <div className="hydro-data-grid">
              {hydroData.length > 0 ? (
                <>
                  <div className="data-item">
                    <span className="label">水温</span>
                    <span className="value">{hydroData[0].water_temperature}°C</span>
                  </div>
                  <div className="data-item">
                    <span className="label">pH值</span>
                    <span className="value">{hydroData[0].pH}</span>
                  </div>
                  <div className="data-item">
                    <span className="label">溶解氧</span>
                    <span className="value">{hydroData[0].dissolved_oxygen}mg/L</span>
                  </div>
                  <div className="data-item">
                    <span className="label">电导率</span>
                    <span className="value">{hydroData[0].conductivity}μS/cm</span>
                  </div>
                  <div className="data-item">
                    <span className="label">浊度</span>
                    <span className="value">{hydroData[0].turbidity}NTU</span>
                  </div>
                  <div className="data-item">
                    <span className="label">氨氮</span>
                    <span className="value">{hydroData[0].ammonia_nitrogen}mg/L</span>
                  </div>
                </>
              ) : (
                <div className="loading">加载水文数据中...</div>
              )}
            </div>
          </div>

          <div className="dashboard-card history-card">
            <div className="card-header">
              <h2>历史水文数据</h2>
              <div className="card-icon">📊</div>
            </div>
            <div className="history-controls">
              <select
                value={selectedDataType}
                onChange={(e) => setSelectedDataType(e.target.value)}
                className="data-type-select"
              >
                <option value="water_temperature">水温</option>
                <option value="pH">pH值</option>
                <option value="dissolved_oxygen">溶解氧</option>
                <option value="conductivity">电导率</option>
                <option value="turbidity">浊度</option>
                <option value="ammonia_nitrogen">氨氮</option>
              </select>
              <select
                value={selectedDays}
                onChange={(e) => setSelectedDays(Number(e.target.value))}
                className="days-select"
              >
                <option value="7">最近7天</option>
                <option value="30">最近30天</option>
                <option value="90">最近90天</option>
              </select>
            </div>
            <div className="Main-chart-container">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => {
                      const d = new Date(date);
                      return `${d.getMonth() + 1}/${d.getDate()}`;
                    }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="rgba(255,255,255,0.7)"
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                    padding={{ left: 20, right: 20 }}
                    minTickGap={50}
                    tickCount={7}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.7)"
                    tickCount={6}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}${getUnit(selectedDataType)}`, getDataTypeLabel(selectedDataType)]}
                    labelFormatter={(date) => date.split(' ')[0]}
                    contentStyle={{
                      backgroundColor: 'rgba(0,0,0,0.8)',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#fff'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#4fc3f7"
                    activeDot={{ r: 6 }}
                    dot={{ r: 2 }}
                    strokeWidth={2}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 第三行：附加功能 + 设备状态 */}
          <div className="dashboard-card control-card">
            <div className="card-header">
              <h2>附加功能</h2>
              <div className="card-icon">⚙️</div>
            </div>
            <div className="control-grid">
              <div className="control-item">
                <div className="control-header">
                  <span className="control-label">摄像头</span>
                  <div className={`control-status ${controlState.camera ? 'active' : ''}`}>
                    {controlState.camera ? '开启' : '关闭'}
                  </div>
                </div>
                <button
                  className={`control-button ${controlState.camera ? 'active' : ''}`}
                  onClick={() => handleControlToggle('camera')}
                >
                  {controlState.camera ? '关闭摄像头' : '开启摄像头'}
                </button>
              </div>

              <div className="control-item">
                <div className="control-header">
                  <span className="control-label">照明系统</span>
                  <div className={`control-status ${controlState.light ? 'active' : ''}`}>
                    {controlState.light ? '开启' : '关闭'}
                  </div>
                </div>
                <button
                  className={`control-button ${controlState.light ? 'active' : ''}`}
                  onClick={() => handleControlToggle('light')}
                >
                  {controlState.light ? '关闭照明' : '开启照明'}
                </button>
              </div>

              <div className="control-item">
                <div className="control-header">
                  <span className="control-label">清洁系统</span>
                  <div className={`control-status ${controlState.cleaner ? 'active' : ''}`}>
                    {controlState.cleaner ? '开启' : '关闭'}
                  </div>
                </div>
                <button
                  className={`control-button ${controlState.cleaner ? 'active' : ''}`}
                  onClick={() => handleControlToggle('cleaner')}
                >
                  {controlState.cleaner ? '关闭清洁' : '开启清洁'}
                </button>
              </div>

              <div className="control-item">
                <div className="control-header">
                  <span className="control-label">水质监测</span>
                  <div className={`control-status ${controlState.monitor ? 'active' : ''}`}>
                    {controlState.monitor ? '开启' : '关闭'}
                  </div>
                </div>
                <button
                  className={`control-button ${controlState.monitor ? 'active' : ''}`}
                  onClick={() => handleControlToggle('monitor')}
                >
                  {controlState.monitor ? '关闭监测' : '开启监测'}
                </button>
              </div>

              <div className="control-item">
                <div className="control-header">
                  <span className="control-label">投喂系统</span>
                  <div className={`control-status ${controlState.feeder ? 'active' : ''}`}>
                    {controlState.feeder ? '开启' : '关闭'}
                  </div>
                </div>
                <button
                  className={`control-button ${controlState.feeder ? 'active' : ''}`}
                  onClick={() => handleControlToggle('feeder')}
                >
                  {controlState.feeder ? '关闭投喂' : '开启投喂'}
                </button>
              </div>

              <div className="control-item">
                <div className="control-header">
                  <span className="control-label">环境调节</span>
                  <div className={`control-status ${controlState.environment ? 'active' : ''}`}>
                    {controlState.environment ? '开启' : '关闭'}
                  </div>
                </div>
                <button
                  className={`control-button ${controlState.environment ? 'active' : ''}`}
                  onClick={() => handleControlToggle('environment')}
                >
                  {controlState.environment ? '关闭调节' : '开启调节'}
                </button>
              </div>
            </div>
          </div>

          <div className="dashboard-card device-card">
            <div className="card-header">
              <h2>设备状态</h2>
              <div className="card-icon">💻</div>
            </div>
            <div className="device-stats-grid">
              {Array.isArray(deviceStats) && deviceStats.length > 0 ? (
                deviceStats.map((stat, index) => {
                  if (!stat || typeof stat.value !== 'number' || typeof stat.name !== 'string') {
                    return (
                      <div key={index} className="device-stat-item error">
                        <div className="stat-header">
                          <span className="stat-label">数据异常</span>
                          <div className="stat-value status-warning">--</div>
                        </div>
                        <div className="stat-progress">
                          <div className="progress-bar" style={{ width: '0%', backgroundColor: '#ccc' }}></div>
                        </div>
                      </div>
                    );
                  }
                  let statusClass = getStatusClass(stat.value, stat.name);
                  let statusColor = getStatusColor(stat.value, stat.name);
                  let unit = getUnit(stat.name);
                  return (
                <div key={index} className="device-stat-item">
                  <div className="stat-header">
                    <span className="stat-label">{stat.name}</span>
                        <div className={`stat-value ${statusClass}`}>
                          {stat.value}{unit}
                    </div>
                  </div>
                  <div className="stat-progress">
                    <div
                      className="progress-bar"
                      style={{
                        width: `${stat.value}%`,
                            backgroundColor: statusColor
                      }}
                    ></div>
                  </div>
                </div>
                  );
                })
              ) : (
                <div className="loading">加载设备状态中...</div>
              )}
            </div>
            <div className="device-status-summary">
              <div className="status-item">
                <span className="status-label">系统状态</span>
                <span className="status-value status-normal">运行正常</span>
              </div>
              <div className="status-item">
                <span className="status-label">最后更新</span>
                <span className="status-value">{new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// 获取数据类型的单位
const getUnit = (type: string): string => {
  if (typeof type !== 'string') return '';
  switch (type) {
    case 'water_temperature':
      return '°C';
    case 'dissolved_oxygen':
      return 'mg/L';
    case 'conductivity':
      return 'μS/cm';
    case 'turbidity':
      return 'NTU';
    case 'ammonia_nitrogen':
      return 'mg/L';
    default:
      return '';
  }
};

// 获取数据类型的显示名称
const getDataTypeLabel = (type: string): string => {
  switch (type) {
    case 'water_temperature':
      return '水温';
    case 'pH':
      return 'pH值';
    case 'dissolved_oxygen':
      return '溶解氧';
    case 'conductivity':
      return '电导率';
    case 'turbidity':
      return '浊度';
    case 'ammonia_nitrogen':
      return '氨氮';
    default:
      return type;
  }
};

// 获取设备状态的颜色
const getStatusColor = (value: number, name: string): string => {
  if (typeof value !== 'number' || typeof name !== 'string') return '#ccc';
  if (name === '设备电量' && value >= 99) return '#4fc3f7'; // 电量99%及以上显示蓝色
  if (value >= 80) return '#f44336'; // 红色
  if (value >= 60) return '#ff9800'; // 橙色
  return '#4caf50'; // 绿色
};

// 获取设备状态的样式类
const getStatusClass = (value: number, name: string): string => {
  if (typeof value !== 'number' || typeof name !== 'string') return 'status-normal';
  if (name === '设备电量' && value >= 99) return 'status-blue'; // 电量99%及以上显示蓝色
  if (value >= 80) return 'status-warning';
  if (value >= 60) return 'status-caution';
  return 'status-normal';
};

export default MainData; 