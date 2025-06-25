import React, { useEffect, useState, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend} from 'recharts';
//import { Map, APILoader, Marker } from '@uiw/react-baidu-map';
import axios from 'axios';
import '../styles/DataCenter.css';
import { useNavigate } from 'react-router-dom';

type StationStatus = 'normal' | 'warning';

interface BaseStation {
  name: string;
  position: [number, number];
  status: StationStatus;
  capacity: string;
}

const randomTips = [
  '建议定期检查电源与信号稳定性。',
  '天气变化可能影响设备运行，请关注天气预警。',
  '可考虑对关键节点传感器增加冗余。',
  '建议加强值班值守，确保快速响应。',
  '传感器数据需定期校准以保证精度。',
];


const baseStations: BaseStation[] = [
  {
    name: '北京基站',
    position: [116.397428, 39.90923],
    status: 'normal',
    capacity: '1.2Gbps',
  },
  {
    name: '上海基站',
    position: [121.473701, 31.230416],
    status: 'warning',
    capacity: '980Mbps',
  },
  {
    name: '广州基站',
    position: [113.264385, 23.129112],
    status: 'normal',
    capacity: '1.3Gbps',
  },
];

const iconStatus: Record<StationStatus, string> = {
  normal: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_b.png',
  warning: 'https://webapi.amap.com/theme/v1.3/markers/n/mark_r.png'
};

declare global {
  interface Window {
    AMap: any;
  }
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

interface FishData {
  id: number;
  species: string;
  total: number;
  new_today: number;
  dead_today: number;
  growth_rate: number;
  activity_range: number;
  weight: number;
  length1: number;
  length2: number;
  length3: number;
  height: number;
  width: number;
  recorded_date: string;
}

interface EnvironmentScore {
  id: number;
  timestamp: string;
  water_quality: number;
  biodiversity: number;
  pollution_index: number;
}

interface Sensor {
  sensor_id: number;
  sensor_type: string;
  status: number;
}

interface CurHydroData {
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

const fixedHydroData: CurHydroData[] = [
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

// 水质标准配置（采用最严格的I类标准）
const WATER_QUALITY_STANDARDS = {
  water_temperature: { max: 30, min: 0 }, // 自定义标准（表中未明确）
  pH: { min: 6.5, max: 8.5 }, // 自定义标准（表中未明确范围）
  dissolved_oxygen: { min: 7.5 }, // I类标准
  conductivity: { max: 400 }, // 自定义标准（表中无电导率）
  turbidity: { max: 1 }, // 自定义标准（NTU）
  ammonia_nitrogen: { max: 0.15 } // I类标准
};

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const DataCenter = () => {

  const randomAdvice = useMemo(() => {
    return randomTips[Math.floor(Math.random() * randomTips.length)];
  }, []);

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleNavClick = (page: string) => {
    switch(page) {
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
        navigate('/intelligence');
        break;
    }
  };

  type FaultySensor = {
    sensor_id: string;
    type: string;
  };

  const [sensorStats, setSensorStats] = useState<{
    total: number;
    statuses: { name: string; value: number }[];
    faulty_list: FaultySensor[];
  }>({
    total: 0,
    statuses: [],
    faulty_list: []
  });

  const [userStats, setUserStats] = useState({ total: 0, roles: [] });
  const [hydroCount, setHydroCount] = useState(0);
  const [fishInfo, setFishInfo] = useState(0);

  
  const mapRef = useRef<HTMLDivElement>(null);

  const [hydroData, setHydroData] = useState<HydroData[]>([]);

  // 获取水文数据列表
  const fetchHydroData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/hydro-data/all');
      const data = await response.json();
      setHydroData(data);
    } catch (error) {
      console.error('获取水文数据失败:', error);
    }
  };

  // 一键导出CSV函数
  const handleHydroExport = () => {
    if (!hydroData.length) {
      alert('没有可导出的数据');
      return;
    }

    const headers = [
      '位置', '水温(℃)', 'pH', '溶氧量(mg/L)', '电导率(μS/cm)',
      '浊度(NTU)', '高锰酸盐指数(mg/L)', '氨氮(mg/L)', 
      '总磷(mg/L)', '总氮(mg/L)', '现场情况', '日期'
    ];

    const csvRows = [
      headers.join(','), // 表头行
      ...hydroData.map(data => [
        `"${data.location}"`, // 用引号包裹防止含逗号
        data.water_temperature,
        data.pH,
        data.dissolved_oxygen,
        data.conductivity,
        data.turbidity,
        data.permanganate_index,
        data.ammonia_nitrogen,
        data.total_phosphorus,
        data.total_nitrogen,
        `"${data.site_condition}"`,
        `"${new Date(data.date).toLocaleString('zh-CN')}"`
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `水文数据_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }; 

  const [fishData, setFishData] = useState<FishData[]>([]);

  // 获取鱼类数据
  const fetchFishData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/fish-data/all');
      const data = await response.json();
      setFishData(data);
    } catch (error) {
      console.error('获取鱼类数据失败:', error);
      alert('获取数据失败，请稍后重试');
    } 
  };

  // 导出CSV函数
  const handleFishExport = () => {
    if (!fishData.length) {
      alert('没有可导出的数据');
      return;
    }

    const headers = [
      '鱼种', '总数', '今日新增', '今日死亡', '生长率(%)',
      '活动范围(m²)', '平均重量(g)', '长度1(cm)', '长度2(cm)', 
      '长度3(cm)', '高度(cm)', '宽度(cm)', '记录时间'
    ];

    const csvRows = [
      headers.join(','),
      ...fishData.map(data => [
        `"${data.species}"`,  // 用引号包裹文本字段
        data.total,
        data.new_today,
        data.dead_today,
        data.growth_rate,
        data.activity_range,
        data.weight || '',
        data.length1 || '',
        data.length2 || '',
        data.length3 || '',
        data.height || '',
        data.width || '',
        `"${new Date(data.recorded_date).toLocaleString('zh-CN')}"`
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `鱼类数据_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [scores, setScores] = useState<EnvironmentScore[]>([]);

  // 获取环境评分数据
  const fetchScores = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/environment/scores');
      const data = await response.json();
      setScores(data);
    } catch (error) {
      console.error('获取环境评分失败:', error);
      alert('获取数据失败，请稍后重试');
    }
  };


  // 获取评分等级
  const getScoreLevel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 75) return '良好';
    if (score >= 60) return '一般';
    return '较差';
  };

  // 导出CSV函数
  const handleScoreExport = () => {
    if (!scores.length) {
      alert('没有可导出的数据');
      return;
    }

    const headers = [
      '记录时间', '水质评分', '水质等级', 
      '生物多样性', '生物多样性等级',
      '污染指数', '污染等级'
    ];

    const csvRows = [
      headers.join(','),
      ...scores.map(score => [
        `"${new Date(score.timestamp).toLocaleString('zh-CN')}"`,
        score.water_quality,
        getScoreLevel(score.water_quality),
        score.biodiversity,
        getScoreLevel(score.biodiversity),
        score.pollution_index,
        getScoreLevel(100 - score.pollution_index)
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `环境评分_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [sensors, setSensors] = useState<Sensor[]>([]);

  // 获取传感器数据
  const fetchSensors = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/sensors/all');
      const data = await response.json();
      setSensors(data);
    } catch (error) {
      console.error('获取传感器数据失败:', error);
      alert('获取数据失败，请稍后重试');
    }
  };
  
  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return '离线';
      case 1: return '正常';
      case 2: return '故障';
      default: return '未知';
    }
  };

  // 导出CSV函数
  const handleSensorExport = () => {
    if (!sensors.length) {
      alert('没有可导出的数据');
      return;
    }

    const headers = ['传感器ID', '传感器类型', '状态', '状态说明'];
    const csvRows = [
      headers.join(','),
      ...sensors.map(sensor => [
        sensor.sensor_id,
        `"${sensor.sensor_type}"`, // 用引号包裹文本字段
        sensor.status,
        getStatusText(sensor.status)
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `传感器数据_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [curHydroData, setCurHydroData] = useState<CurHydroData[]>(fixedHydroData);

  const evaluateWaterQuality = (data: CurHydroData) => {
    const warnings: string[] = [];
    
    // 检查各项指标
    if (data.water_temperature > WATER_QUALITY_STANDARDS.water_temperature.max) {
      warnings.push(`水温过高(${data.water_temperature}°C)`);
    } else if (data.water_temperature < WATER_QUALITY_STANDARDS.water_temperature.min) {
      warnings.push(`水温过低(${data.water_temperature}°C)`);
    }

    if (data.pH > WATER_QUALITY_STANDARDS.pH.max) {
      warnings.push(`pH过高(${data.pH})`);
    } else if (data.pH < WATER_QUALITY_STANDARDS.pH.min) {
      warnings.push(`pH过低(${data.pH})`);
    }

    if (data.dissolved_oxygen < WATER_QUALITY_STANDARDS.dissolved_oxygen.min) {
      warnings.push(`溶氧不足(${data.dissolved_oxygen}mg/L)`);
    }

    if (data.conductivity > WATER_QUALITY_STANDARDS.conductivity.max) {
      warnings.push(`电导率异常(${data.conductivity}μS/cm)`);
    }

    if (data.turbidity > WATER_QUALITY_STANDARDS.turbidity.max) {
      warnings.push(`浊度异常(${data.turbidity}NTU)`);
    }

    if (data.ammonia_nitrogen > WATER_QUALITY_STANDARDS.ammonia_nitrogen.max) {
      warnings.push(`氨氮超标(${data.ammonia_nitrogen}mg/L)`);
    }

    return warnings;
  };


  useEffect(() => {

    //数据初始获取
    axios.get('http://localhost:5000/api/stats').then(res => {
      const data = res.data;
      setUserStats(data.users);
      setSensorStats(data.sensors);
      setHydroCount(data.hydrology);
      setFishInfo(data.fish);
    });

    fetchHydroData();
    fetchFishData();
    fetchScores();
    fetchSensors();
    setCurHydroData(fixedHydroData);

    // 设置定时器每分钟更新所有数据
    const interval = setInterval(() => {
      axios.get('http://localhost:5000/api/stats').then(res => {
        const data = res.data;
        setUserStats(data.users);
        setSensorStats(data.sensors);
        setHydroCount(data.hydrology);
        setFishInfo(data.fish);
      });
    },60000);



    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=07d5026f50f245d70915345fc69e330a&plugin=AMap.Scale,AMap.ToolBar,AMap.InfoWindow`;
    script.async = true;

    script.onload = () => {
      if (!window.AMap || !mapRef.current) return;

      const map = new window.AMap.Map(mapRef.current, {
        zoom: 4,
        center: [104.195397, 35.86166],
        viewMode: '3D',
      });

      map.addControl(new window.AMap.ToolBar());
      map.addControl(new window.AMap.Scale());

      baseStations.forEach((station) => {
        const marker = new window.AMap.Marker({
          position: station.position,
          title: station.name,
          icon: iconStatus[station.status],
          offset: new window.AMap.Pixel(-13, -30),
        });

        const infoWindow = new window.AMap.InfoWindow({
          content: `
            <div class="map-info-window">
              <h3>${station.name}</h3>
              <div class="status ${station.status}">
                ${station.status.toUpperCase()}
              </div>
              <ul>
                <li>位置: ${station.position.join(', ')}</li>
                <li>带宽容量: ${station.capacity}</li>
              </ul>
            </div>
          `,
          offset: new window.AMap.Pixel(0, -30),
        });

        marker.on('click', () => {
          infoWindow.open(map, marker.getPosition());
        });

        map.add(marker);
      });
    };

    document.head.appendChild(script);
    

    return () => {
      if (mapRef.current) {
        mapRef.current.innerHTML = '';
      }
      clearInterval(interval);
    };

    
    
  }, []);

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
              className="nav-button"
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
              className="nav-button active"
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
          <h2>数据中心界面</h2>
          <p className="subtitle">数据统计与分析</p>
        </div>

        <div className="datacenter-dashboard-grid">
          <div className="dashboard-card map-card">
            <div className="card-header">
              <h2>数据基站分布图</h2>
              <div className="card-icon">🗺️</div>
            </div>
            <div id="map-container" ref={mapRef} style={{ width: '100%', height: '500px' }} />
          </div>

          <div className="dashboard-card data-card">
            <div className="card-header">
              <h2>数据库信息统计</h2>
              <div className="card-icon">🔢</div>
            </div>
            <div className="data-stats-grid">
              {[
                {
                  title: '用户信息',
                  content: (
                    <>
                      <p>总用户数：{userStats.total}</p>
                      <PieChart width={200} height={200}>
                        <Pie
                          data={userStats.roles}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={70}
                          label
                        >
                          {userStats.roles.map((_, index) => (
                            <Cell key={`cell-user-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </>
                  )
                },
                {
                  title: '传感器信息',
                  content: (
                    <>
                      <p>传感器总数：{sensorStats.total}</p>
                      <PieChart width={200} height={200}>
                        <Pie
                          data={sensorStats.statuses}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={70}
                          label
                        >
                          {sensorStats.statuses.map((_, index) => (
                            <Cell key={`cell-sensor-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </>
                  )
                },
                {
                  title: '水文信息',
                  content: (
                    <p>数据条数：{hydroCount}</p>
                  )
                },
                {
                  title: '鱼类信息',
                  content: (
                    <p>数据条数：{fishInfo}</p>
                  )
                }
              ].map((stat, index) => (
                <div key={index} className="data-stat-item">
                  <div className="stat-header">
                    <span className="stat-label">{stat.title}</span>
                  </div>
                  <div className="stat-body">
                    {stat.content}
                  </div>
                </div>
              ))}
            </div>
          </div>


          <div className="dashboard-card alart-card">
            <div className="card-header">
              <h2>实时预警信息</h2>
              <div className="card-icon">⚠️</div>
            </div>
            <div className="data-card-content">
              <div className="data-item">
                <span className="label">水文数据</span>
                {(() => {
                  const allWarnings = curHydroData.flatMap(data => {
                    return evaluateWaterQuality(data);
                  });

                  if (allWarnings.length === 0) {
                    return <span className="value-normal">正常</span>;
                  } else if (allWarnings.length === 1) {
                    return <span className="value-warning">{allWarnings[0]}</span>;
                  } else {
                    return (
                      <span className="value-warning">
                        {allWarnings[0]}等{allWarnings.length}项异常
                      </span>
                    );
                  }
                })()}
              </div>
              <div className="data-item">
                <span className="label">数据中心</span>
                {(() => {
                  const warningStations = baseStations.filter(station => station.status === 'warning');
                  if (warningStations.length === 0) {
                    return <span className="value-normal">正常</span>;
                  } else if (warningStations.length === 1) {
                    return <span className="value-warning">{warningStations[0].name}预警</span>;
                  } else {
                    return (
                      <span className="value-warning">
                        {warningStations[0].name}等{warningStations.length}处基站预警
                      </span>
                    );
                  }
                })()}
              </div>
              <div className="data-item">
                <span className="label">传感器</span>
                {(() => {
                  const faultySensors = sensorStats.faulty_list || [];

                  if (faultySensors.length === 0) {
                    return <span className="value-normal">正常</span>;
                  } else if (faultySensors.length === 1) {
                    return (
                      <span className="value-warning">
                        {faultySensors[0].sensor_id}（{faultySensors[0].type}）故障
                      </span>
                    );
                  } else {
                    return (
                      <span className="value-warning">
                        {faultySensors[0].sensor_id}等{faultySensors.length}个传感器故障
                      </span>
                    );
                  }
                })()}
              </div>
            </div>
          </div>

          <div className="dashboard-card advice-card">
            <div className="card-header">
              <h2>AI决策建议</h2>
              <div className="card-icon">🤖</div>
            </div>
            <div className="ai-decision-suggestion flex items-center justify-center text-center h-full p-6 bg-white rounded-2xl shadow">
              {(() => {
                // 提取已有数据状态
                const warningStations = baseStations.filter(station => station.status === 'warning');
                const faultySensors = sensorStats?.faulty_list || [];

                const isDataCenterNormal = warningStations.length === 0;
                const isSensorNormal = faultySensors.length === 0;

                // 时间建议
                const hour = new Date().getHours();
                let timeAdvice = '';
                if (hour >= 0 && hour < 6) {
                  timeAdvice = '当前为夜间，请加强夜班巡查力度。';
                } else if (hour < 12) {
                  timeAdvice = '上午时段适合进行设备巡检。';
                } else if (hour < 18) {
                  timeAdvice = '下午为数据传输高峰，注意网络负载。';
                } else {
                  timeAdvice = '傍晚时段，请检查设备运行状态并做好交接。';
                }


                // 异常状态判断建议
                let statusAdvice = '';
                if (!isSensorNormal && !isDataCenterNormal) {
                  statusAdvice = `⚠️ ${faultySensors.length}个传感器和${warningStations.length}个基站异常，请立即检查。`;
                } else if (!isSensorNormal) {
                  statusAdvice = `⚠️ 发现${faultySensors.length}个传感器故障，建议尽快修复。`;
                } else if (!isDataCenterNormal) {
                  statusAdvice = `⚠️ 检测到${warningStations.length}处基站预警，请核查运行状况。`;
                } else {
                  statusAdvice = '✅ 系统运行正常，无异常项。';
                }

                // 返回最终合并建议
                return (
                  <div className="data-card-content">
                    <div className="data-item">
                      <span className="label">{statusAdvice}</span>
                    </div>
                    <div className="data-item">
                      <span className="label">{'🕒 ' + timeAdvice}</span>
                    </div>
                    <div className="data-item">
                      <span className="label">{'💡 ' + randomAdvice}</span>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

          <div className="dashboard-card export-card">
            <div className="card-header">
              <h2>数据导出</h2>
              <div className="card-icon">↗️</div>
            </div>
            <div className="data-control-grid">
                <div className="data-control-item">
                  <div className="data-control-header">
                    <span className="data-control-label">传感器信息</span>
                  </div>
                  <button className="data-control-button" onClick={handleSensorExport} disabled={!sensors.length}>导出到CSV</button>
                </div>
                
                <div className="data-control-item">
                  <div className="data-control-header">
                    <span className="data-control-label">水文信息</span>
                  </div>
                  <button className="data-control-button" onClick={handleHydroExport} disabled={!hydroData.length}>导出到CSV</button>
                </div>
                
                <div className="data-control-item">
                  <div className="data-control-header">
                    <span className="data-control-label">鱼类信息</span>
                  </div>
                  <button className="data-control-button" onClick={handleFishExport} disabled={!fishData.length}>导出到CSV</button>
                </div>
                
                <div className="data-control-item">
                  <div className="data-control-header">
                    <span className="data-control-label">环境评分信息</span>
                  </div>
                  <button className="data-control-button" onClick={handleScoreExport} disabled={!scores.length}>导出到CSV</button>
                </div>
              </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataCenter;