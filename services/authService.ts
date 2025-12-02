
import { UserData } from '../types';

// --- CONFIGURATION ---
const FEISHU_CONFIG = {
  USE_FEISHU: false, // 强制关闭飞书云端模式，修复 "Network Error" 和 "Failed to fetch"
  APP_ID: 'cli_a9a64a7cc2385bd7', 
  APP_SECRET: 'zKzgu57xyZddCJ7dur0LMgsjbg5DDjSv', 
  APP_TOKEN: 'GSX3btbiDaAhLGsSXaRcT1qunYf', 
  TABLE_ID: 'tblrPvfUDprNlUAG' 
};

// Local Storage Key (Fallback)
const STORAGE_KEY = 'pixel_bead_app_users_db_v1';

// Seed Data for Local Fallback
const DEFAULT_ADMIN: UserData = {
  id: '10000',
  username: 'admin',
  password: 'password', 
  role: 'admin',
  level: 'VIP',
  joinDate: '2023-01-01',
  avatarColor: 'bg-red-500',
  status: 'Active'
};

const getRandomColor = () => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
    'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
    'bg-pink-500', 'bg-rose-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// --- FEISHU ADAPTER ---

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

const getTenantAccessToken = async () => {
  if (FEISHU_CONFIG.APP_ID.includes('xxx')) {
      return null;
  }

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  try {
    const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: FEISHU_CONFIG.APP_ID,
        app_secret: FEISHU_CONFIG.APP_SECRET
      })
    });
    const data = await res.json();
    if (data.code === 0) {
      cachedToken = data.tenant_access_token;
      tokenExpiry = Date.now() + (data.expire - 60) * 1000;
      return cachedToken;
    }
    return null;
  } catch (e) {
    console.error('Network Error:', e);
    return null;
  }
};

const mapFeishuRecordToUser = (record: any): UserData => {
  const f = record.fields;
  const username = f['用户名'] || f.username || 'Unknown';
  const password = f['密码'] || f.password || '';
  const id = f['ID'] || f.id || record.record_id;
  const role = username === 'admin' ? 'admin' : 'user';

  return {
    id: id,
    username: username,
    password: password,
    role: role,
    level: 'Normal',
    joinDate: new Date().toISOString().split('T')[0],
    avatarColor: getRandomColor(),
    status: 'Active'
  };
};

const feishuAdapter = {
  getAllUsers: async (): Promise<UserData[]> => {
    const token = await getTenantAccessToken();
    if (!token) return [];

    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`;
    try {
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.code === 0 && data.data.items) {
          return data.data.items.map(mapFeishuRecordToUser);
        }
    } catch(e) {
        console.error("Feishu Fetch Exception", e);
    }
    return [];
  },

  createUser: async (user: UserData) => {
    const token = await getTenantAccessToken();
    if (!token) return false;

    const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records`;
    
    const payload = {
        fields: {
            "ID": user.id,
            "用户名": user.username,
            "密码": user.password
        }
    };

    try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        return data.code === 0;
    } catch(e) {
        console.error(e);
        return false;
    }
  },

  deleteUser: async (localId: string) => {
    const token = await getTenantAccessToken();
    if (!token) return false;

    const urlList = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records?filter=CurrentValue.[ID]="${localId}"`;
    
    try {
        const resList = await fetch(urlList, { headers: { 'Authorization': `Bearer ${token}` } });
        const dataList = await resList.json();
        
        if (dataList.data?.items?.length > 0) {
          const recordId = dataList.data.items[0].record_id;
          const urlDel = `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TABLE_ID}/records/${recordId}`;
          await fetch(urlDel, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
          return true;
        }
    } catch(e) {
        console.error(e);
    }
    return false;
  },

  toggleVip: async (id: string): Promise<UserData | null> => {
     const users = await feishuAdapter.getAllUsers();
     const user = users.find(u => u.id === id);
     if (user) {
         return { ...user, level: user.level === 'VIP' ? 'Normal' : 'VIP' };
     }
     return null;
  }
};

// --- LOCAL STORAGE ADAPTER (Fallback) ---

const initLocalDB = () => {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    const initialData = [
      DEFAULT_ADMIN,
      { id: '10001', username: 'pixel_user', password: '123', role: 'user', level: 'Normal', joinDate: '2023-05-20', avatarColor: 'bg-blue-500', status: 'Active' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData));
  }
};

const getLocalUsers = (): UserData[] => {
  initLocalDB();
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

const saveLocalUsers = (users: UserData[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};


// --- EXPORTED SERVICE ---

export const authService = {
  // Login
  login: async (username: string, password: string): Promise<{ success: boolean; user?: UserData; message?: string }> => {
    let user: UserData | undefined;

    if (FEISHU_CONFIG.USE_FEISHU) {
      try {
        const users = await feishuAdapter.getAllUsers();
        user = users.find(u => u.username === username);
      } catch (e) {
        return { success: false, message: '云端数据库连接失败' };
      }
    } else {
      // Local
      await new Promise(resolve => setTimeout(resolve, 500));
      const users = getLocalUsers();
      user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    }

    if (!user) return { success: false, message: '用户不存在' };
    if (user.password !== password) return { success: false, message: '密码错误' };
    if (user.status === 'Banned') return { success: false, message: '该账号已被禁用' };

    return { success: true, user };
  },

  // Register / Add User
  register: async (username: string, password: string): Promise<{ success: boolean; user?: UserData; message?: string }> => {
    const newUser: UserData = {
      id: Math.floor(10000 + Math.random() * 90000).toString(),
      username,
      password,
      role: 'user',
      level: 'Normal',
      joinDate: new Date().toISOString().split('T')[0],
      avatarColor: getRandomColor(),
      status: 'Active'
    };

    if (FEISHU_CONFIG.USE_FEISHU) {
      try {
        const users = await feishuAdapter.getAllUsers();
        if (users.find(u => u.username === username)) {
          return { success: false, message: '用户名已存在' };
        }
        
        const success = await feishuAdapter.createUser(newUser);
        if (!success) return { success: false, message: '云端写入失败' };

      } catch (e) {
        return { success: false, message: '云端注册失败' };
      }
    } else {
      // Local Add User Logic
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = getLocalUsers();
      if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return { success: false, message: '用户名已存在' };
      }
      users.push(newUser);
      saveLocalUsers(users);
    }

    return { success: true, user: newUser };
  },

  getAllUsers: async (): Promise<UserData[]> => {
    if (FEISHU_CONFIG.USE_FEISHU) {
      return await feishuAdapter.getAllUsers();
    } else {
      await new Promise(resolve => setTimeout(resolve, 300));
      return getLocalUsers();
    }
  },

  deleteUser: async (id: string): Promise<boolean> => {
    if (FEISHU_CONFIG.USE_FEISHU) {
      return await feishuAdapter.deleteUser(id);
    } else {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = getLocalUsers();
      const newUsers = users.filter(u => u.id !== id);
      saveLocalUsers(newUsers);
      return true;
    }
  },

  toggleVip: async (id: string): Promise<UserData | null> => {
    if (FEISHU_CONFIG.USE_FEISHU) {
        return await feishuAdapter.toggleVip(id);
    } else {
       const users = getLocalUsers();
       const idx = users.findIndex(u => u.id === id);
       if (idx > -1) {
           users[idx].level = users[idx].level === 'VIP' ? 'Normal' : 'VIP';
           saveLocalUsers(users);
           return users[idx];
       }
       return null;
    }
  },
  
  isFeishuEnabled: () => FEISHU_CONFIG.USE_FEISHU
};
