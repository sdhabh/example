// IntelligenceCenter.tsx
import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import '../styles/DataCenter.css';
import '../styles/IntelligenceCenter.css';

const AI_RULES = [
  {
    pattern: /(天气|气象|温度)/i,
    response: () => `当前海域天气：晴，风速3级，水温22°C，适宜养殖作业`
  },
  {
    pattern: /(鱼群|鱼类|鱼种)/i,
    response: () => `最新监测显示：大黄鱼群密度为35尾/立方米，主要分布在A3养殖区`
  },
  {
    pattern: /水质|水况|PH值/i,
    response: () => `水质报告：PH值7.8，溶解氧6.2mg/L，符合一类海水标准`
  },
  {
    pattern: /设备|传感器|故障/i,
    response: (msg: string) => {
      const devices = ['温度传感器', '水质监测仪', '摄像头']
      return `最近24小时设备状态：\n${devices.map(d => `${d}：运行正常`).join('\n')}`
    }
  },
  {
    pattern: /(你好|hello|hi)/i,
    response: () => `您好！我是海洋牧场AI助手，请问有什么可以帮您？`
  },
  {
    pattern: /帮助|怎么用|功能/i,
    response: () => `支持查询以下信息：\n1. 天气/水质\n2. 鱼群分布\n3. 设备状态\n4. 养殖建议`
  },
  {
    pattern: /养殖建议|养殖技巧|建议/i,
    response: () => `根据当前数据，建议您适当增加投喂量，同时注意监控溶解氧水平，确保水质良好。若发现鱼群异常，请及时联系专业人员。`
  },
  {
    pattern: /你是谁|你是谁呀|你是干什么的/i,
    response: () => `我是海洋牧场AI助手，专门为您服务，帮助您了解海洋牧场的各种信息，包括天气、水质、鱼群分布和设备状态等。`
  }
];

const IntelligenceCenter = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 假数据
  const [messages, setMessages] = useState([
    { type: 'ai', content: '您好！我是海洋牧场AI助手，可以问我任何问题' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const trajectoryData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    activity: Math.floor(Math.random() * 100)
  }));

  // 导航处理（保持与DataCenter一致）
  const handleNavClick = (page: string) => {
    switch (page) {
      case 'main': navigate('/dashboard'); break;
      case 'underwater': navigate('/underwater-system'); break;
      case 'data': navigate('/datacenter'); break;
      case 'ai': navigate('/intelligence'); break;
      default: break;
    }
  };
  // 滚动到底部
  useEffect(() => {
    if (messagesEndRef.current && chatMessagesRef.current) {
      chatMessagesRef.current.scrollTo({
        top: messagesEndRef.current.offsetTop,
        behavior: 'smooth'
      });
    }
  }, [messages]); // 当消息更新时触发
  // 模拟AI对话
  const handleSendMessage = () => {
    if (!inputMsg.trim()) return;

    // 用户消息
    const userMessage = inputMsg.trim();
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    // AI回复生成
    setTimeout(() => {
      let aiResponse = '暂时无法回答这个问题，请尝试咨询养殖技术人员';

      // 遍历匹配规则
      for (const rule of AI_RULES) {
        if (rule.pattern.test(userMessage)) {
          aiResponse = typeof rule.response === 'function'
            ? rule.response(userMessage)
            : rule.response;
          break; // 匹配到第一个规则后停止
        }
      }

      setMessages(prev => [
        ...prev,
        {
          type: 'ai',
          content: aiResponse,
          systemInfo: true // 添加标记用于特殊样式
        }
      ]);
    }, 800); // 适当增加延迟更真实

    setInputMsg('');
  };
  interface AnalysisResult {
    species: string;
    confidence: number;
    length: string;
  };

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  // 新增状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dbFishImage, setDbFishImage] = useState<string | null>(null);
  const [dbFishInfo, setDbFishInfo] = useState<{ name: string; scientific: string } | null>(null);

  // 文件选择处理
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult(null); // 清除之前的结果
    }
  };

  // 分析处理
  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);

    // 模拟分析结果
    setTimeout(() => {
      setAnalysisResult({
        species: '预设鱼类',
        confidence: 95,
        length: '32.5cm ± 1.0cm'
      });
      setDbFishInfo({
        name: '大黄鱼',
        scientific: 'Pseudosciaena crocea (Demo)'
      });
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };
  const generateGrowthData = () => {
    const data = [];
    const maxLength = 60; // 改为60厘米
    const growthRate = 0.18; // 调整生长速率

    for (let day = 0; day <= 30; day++) {
      const length = maxLength / (1 + Math.exp(-growthRate * (day - 15)));
      data.push({
        day: day + 1,
        length: Number(length.toFixed(1)),
        stage: day < 10 ? '幼鱼期' : day < 20 ? '快速生长期' : '成熟期'
      });
    }
    return data;
  };

  // 在组件内部使用
  const growthData = generateGrowthData();
  return (
    <div className="dashboard">
      {/* 共用背景和导航 */}
      <div className="ocean-background">
        <div className="wave wave1"></div>
        <div className="wave wave2"></div>
        <div className="wave wave3"></div>
      </div>

      <header className="dashboard-header">
        {/* 保持与DataCenter完全相同的头部 */}
        <div className="header-content">
          <h1>海洋牧场智慧可视化系统</h1>
          <div className="nav-buttons">
            <button className="nav-button" onClick={() => handleNavClick('main')}>主要信息</button>
            <button className="nav-button" onClick={() => handleNavClick('underwater')}>水下系统</button>
            <button className="nav-button" onClick={() => handleNavClick('data')}>数据中心</button>
            <button className="nav-button active" onClick={() => handleNavClick('ai')}>智能中心</button>
          </div>
          <div className="user-info">
            <span>欢迎, {user.username}</span>
            <span className="user-role">({user.role === 'admin' ? '管理员' : '普通用户'})</span>
            <button onClick={handleLogout} className="logout-button">退出</button>
          </div>
        </div>
      </header>

      <main className="int-dashboard-main">
        <div className="dashboard-title">
          <h2>智能分析中心</h2>
          <p className="subtitle">AI图像识别与轨迹分析</p>
        </div>

        <div className="intelligence-grid">
          {/* 左侧列 */}
          <div className="left-column">
            {/* 图像识别区域 */}
            <div className="int-dashboard-card image-card">
              <div className="card-header">
                <h2>鱼类图像识别</h2>
                <div className="card-icon">🐟</div>
              </div>

              <div className="image-content">
                {/* 图片展示区域 */}
                <div className="image-preview">
                  {selectedFile ? (
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="上传的鱼类"
                      className={`preview-image ${isAnalyzing ? 'analyzing' : ''}`}
                    />
                  ) : (
                    <div className="upload-prompt">
                      <span>请上传鱼类图片</span>
                    </div>
                  )}
                </div>

                {/* 底部按钮组 */}
                <div className="analysis-controls">
                  <input
                    type="file"
                    id="fileInput"
                    accept="image/jpeg, image/png"
                    onChange={handleFileSelect}
                    disabled={isAnalyzing}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="fileInput"
                    className="analysis-button"
                  >
                    上传图片
                  </label>
                  <button
                    className={`analysis-button ${isAnalyzing ? 'analyzing' : ''}`}
                    onClick={handleAnalyze}
                    disabled={!selectedFile || isAnalyzing}
                  >
                    {isAnalyzing ? '分析中...' : '开始分析'}
                  </button>
                </div>
              </div>
            </div>

            {/* 识别结果 */}
            <div className="int-dashboard-card result-card">
              <div className="card-header">
                <h2>识别结果分析</h2>
                <div className="card-icon">🔍</div>
              </div>
              <div className="result-content">
                <div className="result-item">
                  <span className="label">物种名称：</span>
                  <span className="value">大黄鱼（Pseudosciaena crocea）</span>
                </div>
                <div className="result-item">
                  <span className="label">置信度：</span>
                  <span className="value">94.5%</span>
                </div>
                <div className="result-item">
                  <span className="label">体长估算：</span>
                  <span className="value">32.4cm ± 1.2cm</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧列 */}
          <div className="right-column">
            {/* AI助理 */}
            <div className="int-dashboard-card ai-card">
              <div className="card-header">
                <h2>AI智能助理</h2>
                <div className="card-icon">🤖</div>
              </div>
              <div className="chat-container">
                <div
                  className="chat-messages"
                  ref={chatMessagesRef}
                >
                  {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.type}`}>
                      {msg.content.split('\n').map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} /> {/* 滚动锚点 */}
                </div>
                <div className="chat-input">
                  <input
                    type="text"
                    value={inputMsg}
                    onChange={(e) => setInputMsg(e.target.value)}
                    placeholder="输入问题..."
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button onClick={handleSendMessage}>发送</button>
                </div>
              </div>
            </div>

            {/* 体长识别 */}
            <div className="int-dashboard-card growth-card">
              <div className="card-header">
                <h2>鱼类体长预测</h2>
                <div className="card-icon">📏</div>
              </div>
              <div className="Intell-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={growthData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  >
                    <XAxis
                      dataKey="day"
                      name="时间"
                      unit="天"
                      tick={{ fill: '#fff' }}
                      axisLine={{ stroke: '#fff' }}
                    />
                    <YAxis
                      name="体长"
                      unit="厘米"
                      tick={{ fill: '#fff' }}
                      axisLine={{ stroke: '#fff' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        border: '1px solid #4fc3f7',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 10 }}
                      formatter={(value) => <span style={{ color: '#fff' }}>{value}</span>}
                    />
                    <Line
                      type="monotone"
                      dataKey="length"
                      name="预测体长"
                      stroke="#4fc3f7"
                      strokeWidth={2}
                      dot={{ fill: '#82ca9d' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default IntelligenceCenter;