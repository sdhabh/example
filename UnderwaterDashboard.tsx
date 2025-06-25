import React, { useEffect, useState } from 'react';
import '../styles/Underwater.css';
// import UnderwaterDataChart from './UnderwaterDataChart'; // Assuming this is not used if not present in original imports
import { Card, CardMedia, CardContent, Typography, Rating, Alert, Grid } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Removed ScatterChart, Scatter, ZAxis, RadarChart, PolarGrid, PolarAngleAxis, Radar as they were not used after mockData removal

// SensorData type seems unused in the provided context after mockData removal, can be removed if not needed elsewhere
// type SensorData = {
//   temperature: number;
//   pressure: number;
//   salinity: number;
//   timestamp: string;
// };

interface Device {
  type: string;
  on: number; // 0 for off, 1 for on
  state: number; // 0: normal, 1: fault, 2: unknown
  description: string;
}

interface FishData {
  id: number;
  species: string;
  total: number;
  newToday: number;
  deadToday: number;
  // weightDistribution: { week: number; weight: number }[]; // Replaced by weightFrequency
  speciesDistribution: { name: string; value: number }[];
  deviceList: Device[];
  // length1?: number; // Replaced by lengthFrequency
  // width?: number;   // Replaced by widthFrequency
  activityRange?: string;
  growthRate?: string;
  oxygenDemand?: string;
  swimmingSpeed?: string;
  temperatureAdaptation?: string;
  groupDensity?: string;
  deepSeaAdaptation?: string;
  pressureTolerance?: string;
  nightActivity?: string;
  baitDemand?: string;
  waterSensitivity?: string;
  reproductionAbility?: string;
  weightFrequency?: { range: string; count: number }[];
  lengthFrequency?: { range: string; count: number }[];
  widthFrequency?: { range: string; count: number }[];
}

export default function UnderwaterDashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [fishDataList, setFishDataList] = useState<FishData[]>([]);
  const [selectedFishId, setSelectedFishId] = useState<number | null>(null);
  const [currentFishData, setCurrentFishData] = useState<FishData | null>(null);
  const [showSpeciesDropdown, setShowSpeciesDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [videoSources, setVideoSources] = useState([
    { url: './video/鱼类监控.mp4', title: '鱼类监控' },
    { url: './video/海参实况.mp4', title: '海参实况' },
    { url: './video/扇贝养殖.mp4', title: '扇贝养殖' }
  ]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const currentVideo = videoSources[currentVideoIndex];

  useEffect(() => {
    const fetchFishData = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get<FishData[]>('http://localhost:5000/api/fish-data'); // Adjust API endpoint as needed
        setFishDataList(response.data);
        if (response.data.length > 0) {
          setSelectedFishId(response.data[0].id);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching fish data:', err);
        setError('无法加载鱼群数据，请稍后再试。');
        // Fallback to empty or handle error display
        setFishDataList([]); 
      }
      setIsLoading(false);
    };
    fetchFishData();
  }, []);

  useEffect(() => {
    if (selectedFishId !== null && fishDataList.length > 0) {
      const foundFish = fishDataList.find(f => f.id === selectedFishId);
      setCurrentFishData(foundFish || null);
    } else {
      setCurrentFishData(null);
    }
  }, [selectedFishId, fishDataList]);

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
        navigate('/intelligence');
        break;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleExportSelectedFishCSV = () => {
    if (!currentFishData) return;
    const headers = ['数据', '值'];
    const rows = [
      ['总数量', currentFishData.total],
      ['今日新增', currentFishData.newToday],
      ['今日死亡', currentFishData.deadToday],
      // Add other relevant data from currentFishData for CSV export
    ];
    let csvContent = headers.join(',') + '\n';
    rows.forEach(rowArray => {
      csvContent += rowArray.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${currentFishData.species}_统计.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  
  // This export function points to a backend endpoint, assuming it exports all fish data
  const handleExportAllFishData = () => {
    window.open('http://localhost:5000/api/export-fish-data', '_blank');
  };

  const uniqueFishForDropdown = fishDataList.reduce((acc, currentFish) => {
    if (!acc.some(item => item.species === currentFish.species)) {
      acc.push(currentFish);
    }
    return acc;
  }, [] as FishData[]);

  const handlePrevVideo = () => {
    setCurrentVideoIndex(prev => (prev === 0 ? videoSources.length - 1 : prev - 1));
  };

  const handleNextVideo = () => {
    setCurrentVideoIndex(prev => (prev === videoSources.length - 1 ? 0 : prev + 1));
  };

  if (error) {
    return <div className="error-dashboard"><Alert severity="error">{error}</Alert></div>;
  }

  const getFishPropertyDisplayName = (key: string) => {
    const map: { [key: string]: string } = {
        activityRange: '活动范围',
        growthRate: '生长速率',
        oxygenDemand: '需氧量',
        swimmingSpeed: '游泳速度',
        temperatureAdaptation: '温度适应范围',
        groupDensity: '群体密度',
        deepSeaAdaptation: '深海适应能力',
        pressureTolerance: '耐压能力',
        nightActivity: '夜间活跃度',
        baitDemand: '饵料需求',
        waterSensitivity: '水质敏感度',
        reproductionAbility: '繁殖能力'
    };
    return map[key] || key;
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>海洋牧场智慧可视化系统</h1>
          <div className="nav-buttons">
            <button className="nav-button" onClick={() => handleNavClick('main')}>主要信息</button>
            <button className="nav-button active" onClick={() => handleNavClick('underwater')}>水下系统</button>
            <button className="nav-button" onClick={() => handleNavClick('data')}>数据中心</button>
            <button className="nav-button" onClick={() => handleNavClick('ai')}>智能中心</button>
          </div>
          <div className="user-info">
            <span>欢迎, {user.username}</span>
            <span className="user-role">({user.role === 'admin' ? '管理员' : '普通用户'})</span>
            <button onClick={handleLogout} className="logout-button">退出</button>
          </div>
        </div>
      </header>
      <div className="ocean-background">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>
      <div className="dashboard-content-wrapper">
        <div className="content-area">
          <div className="dashboard-title">
            <h2>水下系统界面</h2>
            <p className="subtitle">深海环境实时监测与设备控制</p>
          </div>
          <div className="dashboard-grid">
            {/* Row 1, Col 1: 鱼群统计 */}
            <div className="sensor-card fish-stats-card">
              <div className="card-header">
                <h2>鱼群统计</h2>
                <div className="card-icon">🐟</div>
              </div>
              {currentFishData ? (
                <>
                  <table className="stats-table">
                    <tbody>
                      <tr>
                        <td>总数量</td>
                        <td>{currentFishData.total} 尾</td>
                      </tr>
                      <tr>
                        <td>今日新增</td>
                        <td style={{ color: '#4CAF50' }}>+{currentFishData.newToday}</td>
                      </tr>
                      <tr>
                        <td>今日死亡</td>
                        <td style={{ color: '#F44336' }}>-{currentFishData.deadToday}</td>
                      </tr>
                      {currentFishData.growthRate && (
                        <tr>
                          <td>生长速率</td>
                          <td>{currentFishData.growthRate}</td>
                        </tr>
                      )}
                      {currentFishData.activityRange && (
                        <tr>
                          <td>活动范围</td>
                          <td>{currentFishData.activityRange}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  <div className="control-buttons" style={{ marginTop: '1rem', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button
                      className="control-button"
                      onClick={handleExportSelectedFishCSV}
                      disabled={!currentFishData}
                      title="导出CSV"
                    >
                      导出数据
                    </button>
                    <div className="dropdown-container" style={{ position: 'relative' }}>
                      <button
                        className="control-button"
                        onClick={() => setShowSpeciesDropdown(!showSpeciesDropdown)}
                        title="选择鱼群"
                      >
                        选择鱼群
                      </button>
                      {showSpeciesDropdown && uniqueFishForDropdown.length > 0 && (
                        <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: '0', zIndex: 1000 }}>
                          {uniqueFishForDropdown.map(fish => (
                            <div
                              key={fish.id}
                              className="dropdown-item"
                              onClick={() => {
                                setSelectedFishId(fish.id);
                                setShowSpeciesDropdown(false);
                              }}
                            >
                              {fish.species}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : <p>请先选择一个鱼群查看统计数据。</p>}
            </div>

            {/* Row 1, Col 2: 视频播放器 */}
            <div className="sensor-card video-card">
              <div className="card-header">
                <h2>监控视频</h2>
                <div className="card-icon">📹</div>
              </div>
              <div className="video-player-wrapper">
                <video
                  autoPlay
                  muted
                  loop
                  className="video-player"
                  src={currentVideo.url}
                  key={currentVideo.url} // Important for React to re-render
                />
                <button onClick={handlePrevVideo} className="video-nav-button-uw prev" title="上一个视频">⬅️</button>
                <button onClick={handleNextVideo} className="video-nav-button-uw next" title="下一个视频">➡️</button>
              </div>
              {currentVideo && <p className="video-title-uw">{currentVideo.title}</p>}
            </div>

            {/* Row 1, Col 3: 鱼群种类分布 */}
            <div className="sensor-card">
              <div className="card-header">
                <h2>鱼群种类分布</h2>
                <div className="card-icon">📊</div>
              </div>
              {fishDataList.length > 0 ? (() => {
                const aggregatedSpeciesData = fishDataList.reduce((acc, fish) => {
                  const existing = acc.find(item => item.name === fish.species);
                  if (existing) {
                    existing.value += fish.total;
                  } else {
                    acc.push({ name: fish.species, value: fish.total });
                  }
                  return acc;
                }, [] as { name: string; value: number }[]);

                return (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={aggregatedSpeciesData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {aggregatedSpeciesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string, props: any) => [`${value} (${(props.payload.percent * 100).toFixed(1)}%)`, name]} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })() : <p>数据加载中或无鱼群数据。</p>}
            </div>

            {/* Row 2, Col 1: 鱼群重量频率分布 */}
            <div className="sensor-card">
              <div className="card-header">
                <h2>鱼群重量频率分布</h2>
                <div className="card-icon">⚖️</div>
              </div>
              {currentFishData && currentFishData.weightFrequency && currentFishData.weightFrequency.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={currentFishData.weightFrequency}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" name="重量范围(kg)" tick={{ fill: 'white' }} />
                    <YAxis name="数量" tick={{ fill: 'white' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#82ca9d" name="数量" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p>请选择鱼群或等待数据加载以查看重量频率分布。</p>}
            </div>

            {/* Row 2, Col 2: 鱼群长度频率分布 */} 
            <div className="sensor-card">
              <div className="card-header">
                <h2>鱼群长度频率分布</h2>
                <div className="card-icon">📏</div>
              </div>
              {currentFishData && currentFishData.lengthFrequency && currentFishData.lengthFrequency.length > 0 ? (
                 <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={currentFishData.lengthFrequency}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" name="长度范围(cm)" tick={{ fill: 'white' }} />
                        <YAxis name="数量" tick={{ fill: 'white' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" name="数量" />
                    </BarChart>
                 </ResponsiveContainer>
              ) : <p>请选择鱼群或等待数据加载以查看长度频率分布。</p>}
            </div>

            {/* Row 2, Col 3: 鱼群宽度频率分布 */} 
            <div className="sensor-card">
              <div className="card-header">
                <h2>鱼群宽度频率分布</h2>
                <div className="card-icon">📐</div>
              </div>
              {currentFishData && currentFishData.widthFrequency && currentFishData.widthFrequency.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={currentFishData.widthFrequency}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" name="宽度范围(cm)" tick={{ fill: 'white' }} />
                        <YAxis name="数量" tick={{ fill: 'white' }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#ffc658" name="数量" />
                    </BarChart>
                </ResponsiveContainer>
              ) : <p>请选择鱼群或等待数据加载以查看宽度频率分布。</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// The global handleExport function is now part of the component or can be removed if the icon button uses handleExportAllFishData
// const handleExport = () => {
//   window.open('http://localhost:5000/api/export-fish-data', '_blank');
// };


