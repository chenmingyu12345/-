
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Palette, Sliders, Image as ImageIcon, Search, RefreshCw, Zap, LogOut, FileText, Sparkles, AlertCircle, Eraser, Droplet, Smile, User, Lock, ArrowRight, CheckCircle2, X, Crown, Calendar, Hash, Users, Trash2, Edit, TrendingUp, Shield, Plus, Cloud, Database, LayoutGrid } from 'lucide-react';
import { AppConfig, PatternResult, BeadBrand, BeadColor, UserData } from './types';
import { generatePattern, analyzeImageColors } from './services/imageProcessing';
import { PatternCanvas, PatternCanvasHandle } from './components/PatternCanvas';
import { authService } from './services/authService';
import { GoogleGenAI } from "@google/genai";

// Reusable Brand Button
const BrandButton: React.FC<{ brand: BeadBrand; label: string, selected: boolean, onClick: () => void }> = ({ brand, label, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
      selected
        ? 'bg-purple-600 text-white shadow-md transform scale-105'
        : 'bg-white text-gray-600 border border-gray-200 hover:bg-purple-50'
    }`}
  >
    {label}
  </button>
);

// --- ADMIN DASHBOARD ---
const AdminDashboard: React.FC<{ currentUser: UserData; onLogout: () => void; onSwitchToApp: () => void }> = ({ currentUser, onLogout, onSwitchToApp }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const isCloud = authService.isFeishuEnabled();

  const fetchUsers = async () => {
      setIsLoading(true);
      const data = await authService.getAllUsers();
      setUsers(data);
      setIsLoading(false);
  };

  useEffect(() => {
      fetchUsers();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('确定要删除该用户吗？此操作不可恢复。')) {
      const success = await authService.deleteUser(id);
      if (success) {
          fetchUsers();
      }
    }
  };

  const handleToggleVip = async (id: string) => {
      await authService.toggleVip(id);
      fetchUsers();
  };

  const handleAddUser = async () => {
    if (!newUsername || !newPassword) {
        alert('请填写完整的用户名和密码');
        return;
    }
    
    // Add User Logic
    const res = await authService.register(newUsername, newPassword);
    
    if (res.success) {
        alert('用户添加成功！');
        setShowAddUser(false);
        setNewUsername('');
        setNewPassword('');
        fetchUsers(); // Refresh list immediately
    } else {
        alert(res.message || '添加失败');
    }
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans text-gray-800">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-wide">后台管理系统</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 flex flex-col">
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-600 rounded-xl text-white font-medium shadow-lg shadow-purple-900/20 cursor-pointer">
            <Users size={20} />
            用户管理
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-colors cursor-pointer">
            <TrendingUp size={20} />
            数据统计
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-colors cursor-pointer mb-8">
            <Palette size={20} />
            图纸审核
          </div>

          <div className="mt-auto pt-4 border-t border-slate-800/50">
             <div 
               onClick={onSwitchToApp}
               className="flex items-center gap-3 px-4 py-3 text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 rounded-xl transition-colors cursor-pointer"
             >
                <LayoutGrid size={20} />
                <span className="font-bold">返回前台应用</span>
             </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800">
          {/* DB Status Indicator */}
          <div className={`mb-4 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2 ${isCloud ? 'bg-green-500/10 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
              {isCloud ? <Cloud size={14} /> : <Database size={14} />}
              {isCloud ? '飞书云端数据库' : '本地模拟数据库'}
          </div>

          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className={`w-8 h-8 ${currentUser.avatarColor} rounded-full flex items-center justify-center text-xs font-bold`}>
              {currentUser.username[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold truncate">{currentUser.username}</div>
              <div className="text-xs text-slate-500">超级管理员</div>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut size={16} /> 退出登录
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">用户列表</h1>
              <p className="text-gray-500 text-sm mt-1">管理所有注册用户及权限设置</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 min-w-[200px]">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{users.length}</div>
                  <div className="text-xs text-gray-500">总用户数</div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 min-w-[200px]">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                  <Crown size={20} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{users.filter(u => u.level === 'VIP').length}</div>
                  <div className="text-xs text-gray-500">VIP 用户</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="搜索用户名或ID..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button 
                  onClick={() => setShowAddUser(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 shadow-sm"
              >
                  <Plus size={16} /> 添加用户
              </button>

              <button 
                 onClick={fetchUsers}
                 className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                 title="刷新"
              >
                  <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">用户</th>
                  <th className="p-4 font-semibold">角色</th>
                  <th className="p-4 font-semibold">等级</th>
                  <th className="p-4 font-semibold">注册时间</th>
                  <th className="p-4 font-semibold">状态</th>
                  <th className="p-4 font-semibold text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${user.avatarColor} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-gray-900">{user.username}</div>
                          <div className="text-xs text-gray-400">ID: {user.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {user.role === 'admin' ? '管理员' : '普通用户'}
                      </span>
                    </td>
                    <td className="p-4">
                      {user.level === 'VIP' ? (
                        <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-md w-fit">
                          <Crown size={12} fill="currentColor" /> VIP
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">普通</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-gray-600 font-mono">
                      {user.joinDate}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => handleToggleVip(user.id)}
                            className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                            title={user.level === 'VIP' ? "取消VIP" : "设为VIP"}
                        >
                          <Crown size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className={`p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ${user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          disabled={user.role === 'admin'}
                          title={user.role === 'admin' ? "不能删除管理员" : "删除用户"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredUsers.length === 0 && (
               <div className="p-10 text-center text-gray-400">
                 没有找到匹配的用户
               </div>
            )}
          </div>
        </div>
        
        {/* Add User Modal */}
        {showAddUser && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">添加新用户</h3>
                        <button onClick={() => setShowAddUser(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">用户名</label>
                            <input 
                                type="text" 
                                value={newUsername} 
                                onChange={e => setNewUsername(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none font-bold text-gray-700"
                                placeholder="设置用户名"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">密码</label>
                            <input 
                                type="text" 
                                value={newPassword} 
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none font-bold text-gray-700"
                                placeholder="设置初始密码"
                            />
                        </div>
                        <button 
                            onClick={handleAddUser}
                            className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:bg-purple-700 hover:-translate-y-0.5 transition-all mt-2"
                        >
                            确认添加
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

// --- LOGIN PAGE ---
const LoginPage: React.FC<{ onLogin: (user: UserData) => void }> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setIsLoading(true);
    setErrorMsg('');

    try {
        const res = await authService.login(username, password);
        if (res.success && res.user) {
            onLogin(res.user);
        } else {
            setErrorMsg(res.message || '登录失败');
        }
    } catch (e) {
        setErrorMsg('系统错误，请重试');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="w-full p-8 md:p-10">
           <div className="text-center mb-8">
             <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600 transform rotate-6 shadow-lg border-2 border-purple-200">
               <Palette size={32} />
             </div>
             <h1 className="text-2xl font-bold text-gray-800 tracking-tight">拼豆图纸生成器</h1>
             <p className="text-gray-500 text-sm mt-2 font-medium">
                欢迎回来，请登录您的账号
             </p>
           </div>

           {errorMsg && (
               <div className="mb-4 bg-red-50 text-red-500 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                   <AlertCircle size={16} />
                   {errorMsg}
               </div>
           )}

           <form onSubmit={handleSubmit} className="space-y-5">
             <div className="space-y-2">
               <label className="text-sm font-bold text-gray-600 ml-1">账号</label>
               <div className="relative group">
                 <User className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-purple-500 transition-colors" size={20} />
                 <input 
                   type="text" 
                   value={username}
                   onChange={(e) => setUsername(e.target.value)}
                   className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium"
                   placeholder="请输入账号"
                   required
                 />
               </div>
             </div>

             <div className="space-y-2">
               <label className="text-sm font-bold text-gray-600 ml-1">密码</label>
               <div className="relative group">
                 <Lock className="absolute left-4 top-3.5 text-gray-400 group-focus-within:text-purple-500 transition-colors" size={20} />
                 <input 
                   type="password" 
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                   className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all font-medium"
                   placeholder="请输入密码"
                   required
                 />
               </div>
             </div>

             <button 
               type="submit" 
               disabled={isLoading || !username || !password}
               className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 mt-4 ${
                 isLoading || !username || !password
                  ? 'bg-gray-300 cursor-not-allowed' 
                  : 'bg-purple-600 hover:bg-purple-700 hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:shadow-md'
               }`}
             >
               {isLoading ? (
                 <>
                   <RefreshCw className="animate-spin" size={20} />
                   请稍候...
                 </>
               ) : (
                 <>
                   立即登录
                   <ArrowRight size={20} />
                 </>
               )}
             </button>
           </form>

           <div className="mt-8 text-center border-t border-gray-100 pt-6">
             <p className="text-xs text-gray-400">管理员账号: admin / password</p>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- PROFILE MODAL ---
const ProfileModal: React.FC<{ user: UserData; onClose: () => void }> = ({ user, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transform scale-100 transition-transform" 
        onClick={e => e.stopPropagation()}
      >
        <div className="h-24 bg-gradient-to-r from-purple-500 to-indigo-600 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end -mt-10 mb-4">
             <div className={`w-20 h-20 rounded-full border-4 border-white shadow-lg ${user.avatarColor} flex items-center justify-center text-white text-2xl font-bold`}>
               {user.username[0].toUpperCase()}
             </div>
             {user.level === 'VIP' && (
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1 mb-2">
                  <Crown size={12} fill="currentColor" /> VIP 会员
                </div>
             )}
          </div>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900">{user.username}</h2>
            <p className="text-gray-400 text-sm">生活明朗，万物可爱 ✨</p>
          </div>
          
          <div className="space-y-3">
             <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
               <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm">
                 <Hash size={16} />
               </div>
               <div>
                 <div className="text-xs text-gray-400">用户 ID</div>
                 <div className="text-sm font-bold text-gray-700">{user.id}</div>
               </div>
             </div>
             
             <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
               <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 shadow-sm">
                 <Calendar size={16} />
               </div>
               <div>
                 <div className="text-xs text-gray-400">注册时间</div>
                 <div className="text-sm font-bold text-gray-700">{user.joinDate}</div>
               </div>
             </div>
          </div>
          
          <button className="w-full mt-6 py-3 border-2 border-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-colors">
            编辑资料
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [adminView, setAdminView] = useState(false);

  // App Logic State
  const [activeTab, setActiveTab] = useState<'create' | 'scan' | 'ai' | 'cartoon'>('create');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  
  // Create Pattern State
  const [config, setConfig] = useState<AppConfig>({
    width: 50,
    contrast: 1.0,
    saturation: 1.0,
    brightness: 0,
    brand: 'MARD',
    showGrid: true,
    enhanceEdges: true, 
    maxColors: 35, 
    colorPrecision: 10, 
    dithering: false, 
    removeBackground: true, 
    denoise: true 
  });
  const [pattern, setPattern] = useState<PatternResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Scan State
  const [scanImageSrc, setScanImageSrc] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<PatternResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResultImage, setAiResultImage] = useState<string | null>(null);

  // Cartoon State
  const [cartoonPrompt, setCartoonPrompt] = useState(''); 
  const [cartoonSrc, setCartoonSrc] = useState<string | null>(null);
  const [isCartoonGenerating, setIsCartoonGenerating] = useState(false);
  const [cartoonResult, setCartoonResult] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scanFileInputRef = useRef<HTMLInputElement>(null);
  const cartoonFileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<PatternCanvasHandle>(null);
  const scanCanvasRef = useRef<PatternCanvasHandle>(null);
  
  // Default admins to admin view on login
  useEffect(() => {
     if (currentUser?.role === 'admin') {
         setAdminView(true);
     }
  }, [currentUser]);

  useEffect(() => {
    if (imageSrc && activeTab === 'create') {
      processImage();
    }
  }, [imageSrc, config]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setSrc: (s: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!imageSrc) return;
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      const result = await generatePattern(imageSrc, config);
      setPattern(result);
    } catch (error) {
      console.error(error);
      alert('生成图纸失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanAnalyze = async () => {
    if (!scanImageSrc) return;
    setIsScanning(true);
    try {
        const result = await analyzeImageColors(scanImageSrc, config.brand) as PatternResult;
        setScanResult(result);
    } catch (e) {
        console.error(e);
        alert('分析失败');
    } finally {
        setIsScanning(false);
    }
  };

  const handleDownload = () => {
    if (canvasRef.current) {
        const dataUrl = canvasRef.current.toDataURL('image/png');
        if (dataUrl) {
            const link = document.createElement('a');
            link.download = '拼豆图纸.png';
            link.href = dataUrl;
            link.click();
        }
    }
  };

  const handleDownloadPixelImage = () => {
     // @ts-ignore
     if (canvasRef.current && canvasRef.current.toPixelImageURL) {
         // @ts-ignore
         const dataUrl = canvasRef.current.toPixelImageURL('image/png');
         if (dataUrl) {
             const link = document.createElement('a');
             link.download = '拼豆像素图.png';
             link.href = dataUrl;
             link.click();
         }
     }
  };

  const handleDownloadScanResult = () => {
      if (scanCanvasRef.current) {
        const dataUrl = scanCanvasRef.current.toDataURL('image/png');
        if (dataUrl) {
            const link = document.createElement('a');
            link.download = '色号识别图.png';
            link.href = dataUrl;
            link.click();
        }
      }
  };

  const handleAiGenerate = async () => {
      if (!aiPrompt) return;
      setAiGenerating(true);
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const finalPrompt = `pixel art style, ${aiPrompt}, clean lines, vibrant colors, flat design, white background`;
          
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                  parts: [{ text: finalPrompt }]
              },
          });
          
          let foundImage = false;
          if (response.candidates?.[0]?.content?.parts) {
             for (const part of response.candidates[0].content.parts) {
                 if (part.inlineData) {
                     const base64 = part.inlineData.data;
                     const url = `data:${part.inlineData.mimeType};base64,${base64}`;
                     setAiResultImage(url);
                     foundImage = true;
                     break;
                 }
             }
          }
          
          if (!foundImage) {
              alert("未生成图片，请重试或修改提示词");
          }

      } catch (e) {
          console.error(e);
          alert("AI 生成失败，请检查网络或 Key");
      } finally {
          setAiGenerating(false);
      }
  };

  const handleCartoonGenerate = async () => {
    if (!cartoonSrc) return;
    setIsCartoonGenerating(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const base64Data = cartoonSrc.split(',')[1];
        
        const promptText = `Redraw this exact image. Strictly maintain the original composition, pose, and proportions. Do not change the subject's position or the background elements structure. Convert the style to a cute, flat 2D cartoon vector style suitable for pixel art. Use simple bold lines and solid blocks of color. Make it look like a sticker. ${cartoonPrompt}`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg', 
                            data: base64Data
                        }
                    },
                    { text: promptText }
                ]
            }
        });

        let foundImage = false;
        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64 = part.inlineData.data;
                    const url = `data:${part.inlineData.mimeType};base64,${base64}`;
                    setCartoonResult(url);
                    foundImage = true;
                    break;
                }
            }
        }
        if (!foundImage) alert("转换失败");

    } catch (e) {
        console.error(e);
        alert("生成失败");
    } finally {
        setIsCartoonGenerating(false);
    }
  };

  const useAiImage = (url: string) => {
      setImageSrc(url);
      setActiveTab('create');
  };

  const handleLoginSuccess = (user: UserData) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      setCurrentUser(null);
      setPattern(null);
      setImageSrc(null);
      setScanResult(null);
      setAiResultImage(null);
      setCartoonResult(null);
    }
  };

  // --- RENDER LOGIC ---

  if (!currentUser) {
    return <LoginPage onLogin={handleLoginSuccess} />;
  }

  // Show Admin Dashboard only if user is admin AND they are in admin view mode
  if (currentUser.role === 'admin' && adminView) {
    return <AdminDashboard currentUser={currentUser} onLogout={handleLogout} onSwitchToApp={() => setAdminView(false)} />;
  }

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-purple-600 text-white p-2 rounded-lg">
              <Palette size={20} />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
              拼豆图纸生成器
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Admin Quick Switch */}
             {currentUser.role === 'admin' && (
                 <button 
                   onClick={() => setAdminView(true)}
                   className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-slate-800 transition-colors"
                 >
                   <Shield size={14} /> 后台管理
                 </button>
             )}

             {/* User Profile Trigger */}
             <button 
               onClick={() => setShowProfile(true)}
               className="flex items-center gap-2 hover:bg-gray-50 p-1.5 rounded-full pr-3 transition-colors border border-transparent hover:border-gray-100"
             >
               <div className={`w-8 h-8 rounded-full ${currentUser.avatarColor} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white shadow-sm`}>
                 {currentUser.username[0].toUpperCase()}
               </div>
               <span className="text-sm font-bold text-gray-700 max-w-[100px] truncate">{currentUser.username}</span>
             </button>

             <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors" title="退出登录">
               <LogOut size={20} />
             </button>
          </div>
        </div>
      </header>

      {/* Profile Modal */}
      {showProfile && (
        <ProfileModal user={currentUser} onClose={() => setShowProfile(false)} />
      )}

      {/* Navigation */}
      <div className="max-w-6xl mx-auto px-4 mt-6">
         <div className="bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 inline-flex gap-1 w-full md:w-auto overflow-x-auto">
            <button 
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'create' ? 'bg-purple-100 text-purple-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Palette size={18} /> 生成图纸
            </button>
            <button 
              onClick={() => setActiveTab('scan')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'scan' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Search size={18} /> 色号识别
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'ai' ? 'bg-blue-100 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Sparkles size={18} /> AI 智能生图
            </button>
             <button 
              onClick={() => setActiveTab('cartoon')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'cartoon' ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <Smile size={18} /> 生成卡通
            </button>
         </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 mt-6">
        
        {/* === CREATE TAB === */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar Controls */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Upload Card */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <ImageIcon size={20} className="text-purple-500" />
                  步骤1: 上传图片
                </h2>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-200 rounded-2xl p-8 text-center cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-all group"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setImageSrc)}
                  />
                  <div className="w-16 h-16 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={28} />
                  </div>
                  <p className="text-sm font-bold text-gray-600">点击上传图片</p>
                  <p className="text-xs text-gray-400 mt-1">支持 JPG, PNG</p>
                </div>
                
                {imageSrc && (
                  <div className="mt-4 relative rounded-xl overflow-hidden border border-gray-200 h-32">
                    <img src={imageSrc} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                       onClick={() => setImageSrc(null)}
                       className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                    >
                      <LogOut size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Settings Card */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Sliders size={20} className="text-purple-500" />
                  步骤2: 调整参数
                </h2>

                <div className="space-y-6">
                  {/* Brand Selection */}
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block uppercase">珠子品牌</label>
                    <div className="flex flex-wrap gap-2">
                      <BrandButton brand="MARD" label="MARD" selected={config.brand === 'MARD'} onClick={() => setConfig({...config, brand: 'MARD'})} />
                      <BrandButton brand="COCO" label="COCO" selected={config.brand === 'COCO'} onClick={() => setConfig({...config, brand: 'COCO'})} />
                      <BrandButton brand="MANMAN" label="漫漫" selected={config.brand === 'MANMAN'} onClick={() => setConfig({...config, brand: 'MANMAN'})} />
                    </div>
                  </div>

                  {/* Size Slider */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">图纸宽度 (豆子个数)</label>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{config.width}</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="100" 
                      value={config.width} 
                      onChange={(e) => setConfig({...config, width: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>

                  {/* Max Colors Slider */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">颜色数量限制</label>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{config.maxColors}</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" 
                      max="50" 
                      value={config.maxColors} 
                      onChange={(e) => setConfig({...config, maxColors: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>

                   {/* Color Precision Slider */}
                   <div>
                    <div className="flex justify-between mb-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">颜色匹配精度 (Grouping)</label>
                      <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{config.colorPrecision}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="30" 
                      value={config.colorPrecision} 
                      onChange={(e) => setConfig({...config, colorPrecision: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">数值越大，颜色区域越统一（细节减少）</p>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Eraser size={16} /> 自动去除背景
                        </span>
                        <div 
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${config.removeBackground ? 'bg-purple-500' : 'bg-gray-300'}`}
                            onClick={() => setConfig({...config, removeBackground: !config.removeBackground})}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${config.removeBackground ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>

                     <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Droplet size={16} /> 颜色抖动 (平滑过渡)
                        </span>
                        <div 
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${config.dithering ? 'bg-purple-500' : 'bg-gray-300'}`}
                            onClick={() => setConfig({...config, dithering: !config.dithering})}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${config.dithering ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <Zap size={16} /> 去除杂色 (大色块)
                        </span>
                        <div 
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${config.denoise ? 'bg-purple-500' : 'bg-gray-300'}`}
                            onClick={() => setConfig({...config, denoise: !config.denoise})}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${config.denoise ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                           <FileText size={16} /> 增强线条边缘
                        </span>
                        <div 
                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${config.enhanceEdges ? 'bg-purple-500' : 'bg-gray-300'}`}
                            onClick={() => setConfig({...config, enhanceEdges: !config.enhanceEdges})}
                        >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${config.enhanceEdges ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>

                  </div>

                </div>
              </div>
            </div>

            {/* Main Canvas Area */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-lg font-bold text-gray-800">图纸预览</h2>
                   <div className="flex gap-2">
                      <button 
                        onClick={handleDownloadPixelImage}
                        disabled={!pattern}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <Download size={16} /> 下载像素图
                      </button>
                      <button 
                        onClick={handleDownload}
                        disabled={!pattern}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-lg shadow-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <Download size={16} /> 下载图纸
                      </button>
                   </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border border-gray-100 p-4 relative overflow-hidden">
                  {isProcessing && (
                    <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="animate-spin text-purple-600" size={32} />
                        <span className="text-sm font-bold text-gray-600">正在生成像素点阵...</span>
                      </div>
                    </div>
                  )}
                  <PatternCanvas 
                    ref={canvasRef}
                    pattern={pattern} 
                    config={config} 
                    className="max-w-full shadow-xl"
                  />
                </div>
              </div>

              {/* Stats Panel */}
              {pattern && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center justify-between">
                    <span>颜色统计</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded-lg text-gray-500">共 {pattern.colorCounts.size} 种颜色</span>
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from(pattern.colorCounts.values())
                      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
                      .map((stat: { count: number; color: BeadColor }) => (
                      <div key={stat.color.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <div 
                          className="w-8 h-8 rounded-lg shadow-sm border border-black/5"
                          style={{ backgroundColor: stat.color.hex }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-700">{stat.color.id}</span>
                          <span className="text-[10px] text-gray-400">{stat.count} 颗</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ... (Rest of tabs remain unchanged) ... */}
        {/* === SCAN TAB === */}
        {activeTab === 'scan' && (
             <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-3xl mx-auto">
                 <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-gray-800">色号识别</h2>
                     <p className="text-gray-500 mt-2">上传现有的像素图，AI 将自动识别对应的色号</p>
                 </div>
                 
                 <div 
                    onClick={() => scanFileInputRef.current?.click()}
                    className="border-2 border-dashed border-green-200 bg-green-50/50 rounded-2xl p-10 text-center cursor-pointer hover:bg-green-50 hover:border-green-400 transition-all mb-8"
                 >
                    <input 
                        type="file" 
                        ref={scanFileInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, (src) => {
                            setScanImageSrc(src);
                            setScanResult(null); // reset result
                        })}
                    />
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search size={32} />
                    </div>
                    {scanImageSrc ? (
                        <p className="font-bold text-green-700">图片已选择，点击更换</p>
                    ) : (
                        <p className="text-gray-500 font-medium">点击上传像素图片</p>
                    )}
                 </div>

                 {scanImageSrc && (
                     <div className="space-y-6">
                         <div className="flex justify-center">
                            <button 
                                onClick={handleScanAnalyze}
                                disabled={isScanning}
                                className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 disabled:opacity-50 flex items-center gap-2"
                            >
                                {isScanning ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />}
                                {isScanning ? '正在识别...' : '开始识别色号'}
                            </button>
                         </div>

                         {/* Result Visualization */}
                         {scanResult && (
                             <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800">识别结果预览</h3>
                                    <button 
                                        onClick={handleDownloadScanResult}
                                        className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold hover:bg-green-200 transition-colors flex items-center gap-1"
                                    >
                                        <Download size={14} /> 下载标记图
                                    </button>
                                </div>
                                <div className="flex justify-center mb-6">
                                    <PatternCanvas 
                                        ref={scanCanvasRef}
                                        pattern={scanResult} 
                                        config={{...config, showGrid: true}} 
                                        className="shadow-md"
                                    />
                                </div>

                                <h3 className="font-bold text-gray-800 mb-4 border-t pt-4">色号统计清单</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Array.from(scanResult.colorCounts.values())
                                        .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
                                        .map((item: { count: number; color: BeadColor }) => (
                                        <div key={item.color.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                            <div 
                                                className="w-10 h-10 rounded-lg shadow-inner"
                                                style={{ backgroundColor: item.color.hex }}
                                            />
                                            <div>
                                                <div className="font-bold text-gray-800 text-sm">{item.color.id}</div>
                                                <div className="text-xs text-gray-500">{item.count} 颗</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                             </div>
                         )}
                     </div>
                 )}
             </div>
        )}

        {/* === AI TAB === */}
        {activeTab === 'ai' && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
                 <div className="grid md:grid-cols-2 gap-8">
                     <div className="space-y-6">
                         <div>
                             <h2 className="text-2xl font-bold text-gray-800 mb-2">AI 智能生图</h2>
                             <p className="text-gray-500">描述你想要的画面，AI 帮你生成像素风格素材</p>
                         </div>
                         
                         <div>
                             <label className="text-sm font-bold text-gray-700 block mb-2">画面描述 (Prompt)</label>
                             <textarea 
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none resize-none transition-all"
                                placeholder="例如：一只可爱的小猫，像素风格，简单的线条..."
                             />
                         </div>
                         
                         <button 
                            onClick={handleAiGenerate}
                            disabled={!aiPrompt || aiGenerating}
                            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                         >
                            {aiGenerating ? <RefreshCw className="animate-spin" /> : <Sparkles />}
                            {aiGenerating ? 'AI 正在思考...' : '立即生成'}
                         </button>
                     </div>

                     <div className="bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center min-h-[300px] relative overflow-hidden">
                         {!aiResultImage && (
                             <div className="text-center text-gray-400">
                                 <Sparkles size={48} className="mx-auto mb-3 opacity-20" />
                                 <p>生成的图片将显示在这里</p>
                             </div>
                         )}
                         {aiResultImage && (
                             <div className="w-full h-full p-4 flex flex-col items-center">
                                 <img src={aiResultImage} alt="AI Result" className="max-h-[250px] object-contain rounded-lg shadow-md mb-4" />
                                 <button 
                                    onClick={() => useAiImage(aiResultImage)}
                                    className="bg-white text-blue-600 px-6 py-2 rounded-full font-bold shadow-md hover:bg-blue-50 transition-colors text-sm"
                                 >
                                     使用这张图片制作图纸
                                 </button>
                             </div>
                         )}
                     </div>
                 </div>
            </div>
        )}

        {/* === CARTOON TAB === */}
        {activeTab === 'cartoon' && (
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
                 <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-gray-800">照片转卡通</h2>
                     <p className="text-gray-500 mt-2">上传真人照片，生成适合拼豆的可爱卡通风格</p>
                 </div>

                 <div className="grid md:grid-cols-2 gap-8">
                    {/* Left: Input */}
                    <div className="space-y-4">
                        <div 
                            onClick={() => cartoonFileInputRef.current?.click()}
                            className="border-2 border-dashed border-orange-200 bg-orange-50/30 rounded-2xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 transition-all relative overflow-hidden"
                        >
                            <input 
                                type="file" 
                                ref={cartoonFileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, setCartoonSrc)}
                            />
                            {cartoonSrc ? (
                                <img src={cartoonSrc} className="w-full h-full object-contain absolute inset-0" />
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-3">
                                        <Upload size={24} />
                                    </div>
                                    <p className="text-gray-500 font-medium">上传照片</p>
                                </>
                            )}
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">额外要求 (可选)</label>
                            <input 
                                type="text"
                                value={cartoonPrompt}
                                onChange={(e) => setCartoonPrompt(e.target.value)}
                                placeholder="例如：加上一顶红色的帽子"
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-orange-500 outline-none"
                            />
                        </div>

                        <button 
                            onClick={handleCartoonGenerate}
                            disabled={!cartoonSrc || isCartoonGenerating}
                            className="w-full py-3 bg-orange-500 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                         >
                            {isCartoonGenerating ? <RefreshCw className="animate-spin" /> : <Smile />}
                            {isCartoonGenerating ? '正在转换...' : '生成卡通形象'}
                         </button>
                    </div>

                    {/* Right: Output */}
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 h-full min-h-[300px] flex items-center justify-center relative">
                        {!cartoonResult && (
                             <div className="text-center text-gray-400">
                                 <Smile size={48} className="mx-auto mb-3 opacity-20" />
                                 <p>卡通效果预览</p>
                             </div>
                         )}
                         {cartoonResult && (
                             <div className="w-full h-full p-4 flex flex-col items-center justify-center">
                                 <img src={cartoonResult} alt="Result" className="max-h-[250px] object-contain rounded-lg shadow-md mb-4" />
                                 <button 
                                    onClick={() => useAiImage(cartoonResult)}
                                    className="bg-white text-orange-600 px-6 py-2 rounded-full font-bold shadow-md hover:bg-orange-50 transition-colors text-sm"
                                 >
                                     去生成图纸
                                 </button>
                             </div>
                         )}
                    </div>
                 </div>
            </div>
        )}

      </main>
    </div>
  );
}

export default App;
