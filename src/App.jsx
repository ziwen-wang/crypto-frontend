import React, { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Settings,
  X,
  RefreshCw,
  Database,
  TrendingUp,
  TrendingDown,
  Layers,
  Zap,
} from "lucide-react";

// --- 高级模拟数据生成器 (适配新后端逻辑) ---
const generateAdvancedMockData = (coinId) => {
  const basePrices = { BTC: 96000, ETH: 3600, SOL: 190, BNB: 650, DOGE: 0.4 };
  const base = basePrices[coinId] || 100;

  // 生成 K 线模拟趋势
  const history = [];
  let price = base * 0.9;
  for (let i = 30; i >= 0; i--) {
    price = price * (1 + (Math.random() - 0.45) * 0.05); // 随机游走
    history.push({ index: 30 - i, price: price });
  }
  const currentPrice = history[history.length - 1].price;

  // 随机生成指标状态
  const rsi = 25 + Math.random() * 50; // 25 ~ 75
  const isBelowBB = Math.random() > 0.7; // 30% 概率跌破布林带
  const isSmaSupport = Math.random() > 0.6; // 40% 概率踩稳均线
  const isMacdGold = Math.random() > 0.8; // 20% 概率金叉

  let score = 0;
  let reasons = [];

  // 模拟评分逻辑
  if (rsi < 35) {
    score += 30;
    reasons.push(`RSI (${rsi.toFixed(1)}) 进入超卖区`);
  }
  if (isBelowBB) {
    score += 30;
    reasons.push("价格击穿布林带下轨 (超跌)");
  }
  if (isSmaSupport) {
    score += 20;
    reasons.push("回踩 200日均线 关键支撑");
  } else {
    reasons.push("价格位于 200日均线下方 (熊市压制)");
    score -= 10;
  }

  if (isMacdGold) {
    score += 20;
    reasons.push("MACD 动量金叉 (反转信号)");
  }

  let signal = "观望 (HOLD)";
  if (score >= 60) signal = "强力买入 (STRONG BUY)";
  else if (score >= 30) signal = "定投区间 (DCA)";
  else if (score < 10) signal = "建议卖出 (SELL)";

  return {
    symbol: coinId,
    price: currentPrice,
    priceChangePercent: (Math.random() * 10 - 5).toFixed(2),
    rsi,
    score,
    signal,
    reasons,
    dropFromAth: 20 + Math.random() * 40,
    history,
  };
};

// --- 配置面板组件 ---
const ConfigPanel = ({ config, onSave, onClose }) => {
  const [local, setLocal] = useState(config);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-white flex gap-2">
            <Settings size={18} /> 量化参数设置
          </h3>
          <button onClick={onClose}>
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>RSI 买入阈值</span>{" "}
              <span className="text-emerald-400">&lt; {local.rsiBuy}</span>
            </div>
            <input
              type="range"
              min="15"
              max="45"
              value={local.rsiBuy}
              onChange={(e) => setLocal({ ...local, rsiBuy: e.target.value })}
              className="w-full accent-emerald-500 h-2 bg-slate-700 rounded-lg appearance-none"
            />
          </div>
          <div>
            <div className="flex justify-between text-sm text-slate-300 mb-2">
              <span>ATH 回撤阈值</span>{" "}
              <span className="text-blue-400">&gt; {local.dropThreshold}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="90"
              value={local.dropThreshold}
              onChange={(e) =>
                setLocal({ ...local, dropThreshold: e.target.value })
              }
              className="w-full accent-blue-500 h-2 bg-slate-700 rounded-lg appearance-none"
            />
          </div>
        </div>
        <button
          onClick={() => onSave(local)}
          className="w-full mt-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500"
        >
          保存配置
        </button>
      </div>
    </div>
  );
};

// --- 主程序 ---
export default function CryptoQuantApp() {
  const [selectedCoin, setSelectedCoin] = useState("BTC");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ rsiBuy: 30, dropThreshold: 50 });
  const [showConfig, setShowConfig] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [error, setError] = useState(null);

  const coins = ["BTC", "ETH", "SOL", "BNB", "DOGE", "XRP"];

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setIsMock(false);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000); // 2秒超时快速回退

      const res = await fetch("http://localhost:3001/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: selectedCoin, strategy: config }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error("Backend Error");
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.log("Using advanced mock data");
      setIsMock(true);
      setData(generateAdvancedMockData(selectedCoin));
      if (e.name !== "AbortError") setError("本地后端未连接");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCoin, config]);

  // 动态样式计算
  const getStyles = (score) => {
    if (score >= 60)
      return {
        bg: "from-emerald-900/50 to-emerald-900/10",
        text: "text-emerald-400",
        bar: "bg-emerald-500",
        border: "border-emerald-500/30",
      };
    if (score <= 20)
      return {
        bg: "from-red-900/50 to-red-900/10",
        text: "text-red-400",
        bar: "bg-red-500",
        border: "border-red-500/30",
      };
    return {
      bg: "from-blue-900/50 to-blue-900/10",
      text: "text-blue-400",
      bar: "bg-blue-500",
      border: "border-blue-500/30",
    };
  };

  const style = data ? getStyles(data.score) : {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 flex justify-center items-start pt-10">
      {showConfig && (
        <ConfigPanel
          config={config}
          onSave={(c) => {
            setConfig(c);
            setShowConfig(false);
          }}
          onClose={() => setShowConfig(false)}
        />
      )}

      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <header className="flex justify-between items-center py-2 px-1">
          <div className="flex items-center gap-2">
            <Activity className="text-blue-500" />
            <h1 className="text-xl font-bold tracking-tight">
              CryptoQuant{" "}
              <span className="text-xs font-normal opacity-50">Pro</span>
            </h1>
          </div>
          <div className="flex gap-2">
            {isMock && (
              <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-500 text-[10px] border border-yellow-500/20 flex items-center gap-1">
                <Database size={10} /> DEMO
              </span>
            )}
            <button
              onClick={() => setShowConfig(true)}
              className="p-2 bg-slate-900 rounded-full border border-slate-800 hover:bg-slate-800"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Coin Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {coins.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCoin(c)}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                selectedCoin === c
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
                  : "bg-slate-900 border border-slate-800 text-slate-400"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading && (
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="animate-spin text-blue-500" />
          </div>
        )}

        {data && !loading && (
          <>
            {/* Main Signal Card */}
            <div
              className={`relative overflow-hidden rounded-3xl border ${style.border} bg-gradient-to-br ${style.bg} p-6 shadow-2xl transition-all duration-500`}
            >
              <div className="flex justify-between items-start mb-6 relative z-10">
                <div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Zap size={12} /> AI 综合信号
                  </div>
                  <div
                    className={`text-2xl font-black tracking-tight ${style.text}`}
                  >
                    {data.signal}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-mono font-bold">
                    ${data.price.toLocaleString()}
                  </div>
                  <div
                    className={`text-xs font-bold ${
                      data.priceChangePercent >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {data.priceChangePercent}% (24h)
                  </div>
                </div>
              </div>

              {/* Score Bar */}
              <div className="relative h-2 bg-slate-900/50 rounded-full mb-6 overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full ${style.bar} transition-all duration-1000`}
                  style={{ width: `${Math.min(data.score, 100)}%` }}
                ></div>
              </div>

              {/* Reasons List */}
              <div className="space-y-3 relative z-10">
                {data.reasons.length > 0 ? (
                  data.reasons.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 text-xs font-medium text-slate-200 bg-black/20 p-2 rounded-lg backdrop-blur-sm border border-white/5"
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${style.bar} shadow-[0_0_8px_currentColor]`}
                      ></div>
                      {r}
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-slate-500 text-center py-2">
                    市场波动平稳，暂无强力信号
                  </div>
                )}
              </div>
            </div>

            {/* Indicators Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1">
                  <Layers size={12} /> RSI (14)
                </div>
                <div
                  className={`text-xl font-black font-mono ${
                    data.rsi < 30
                      ? "text-emerald-400"
                      : data.rsi > 70
                      ? "text-red-400"
                      : "text-slate-200"
                  }`}
                >
                  {data.rsi.toFixed(1)}
                </div>
              </div>
              <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col justify-between">
                <div className="text-slate-500 text-xs font-bold mb-1 flex items-center gap-1">
                  <TrendingDown size={12} /> ATH 回撤
                </div>
                <div className="text-xl font-black font-mono text-blue-400">
                  -{data.dropFromAth.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-40 bg-slate-900 rounded-2xl border border-slate-800 p-4 relative overflow-hidden">
              <div className="absolute top-3 left-4 text-xs font-bold text-slate-500">
                30天趋势概览
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.history}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#colorPrice)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
