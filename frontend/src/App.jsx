/**
 * CareLine App - 化疗周期副作用管理系统
 * 完整前端应用：登录 → 入驻 → 主界面
 */
import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from './utils/api';
import { toDateStr } from './hooks/useCareline';

// ═══════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════
const ENERGY_PATIENT = ["精神不错", "稍微有点累", "需要多歇歇", "大部分时间在床上", "今天比较辛苦"];
const ENERGY_CARE = ["0 正常", "1 轻度受限", "2 中度受限", "3 重度受限", "4 卧床"];
const NAUSEA_PATIENT = ["舒服", "有一点点", "有些难受", "很不舒服"];
const NAUSEA_CARE = ["0 无", "1 轻微", "2 中度", "3 重度"];
const APPETITE_LABELS = ["什么都不想吃", "勉强吃几口", "吃了一点", "吃了一些", "还不错", "胃口很好"];
const SLEEP_LABELS = ["睡得很香", "睡得还行", "有点没睡好", "基本没睡"];
const BRISTOL_ICONS = ["⬤", "⬤⬤", "🟤", "🟡", "🟡", "🟠", "💧"];
const BRISTOL_SHORT = ["硬块", "硬条", "裂纹条", "软条 ✓", "软团 ✓", "糊状", "水样"];
const ECOLORS = ["#43A047", "#7CB342", "#FDD835", "#FB8C00", "#E53935"];
const NCOLORS = ["#43A047", "#FDD835", "#FB8C00", "#E53935"];
const STATUS_CONFIG = {
  good: { bg: "#E8F5E9", border: "#A5D6A7" },
  okay: { bg: "#FFF8E1", border: "#FFE082" },
  tough: { bg: "#FFF3E0", border: "#FFCC80" },
};

// ═══════════════════════════════════════════════════════════════════════
//  SHARED UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════
const Card = ({ children, style: s = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: "#fff", borderRadius: 20, padding: 20,
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)", ...s,
  }}>{children}</div>
);

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 16, fontWeight: 700, color: "#2D2D2D", letterSpacing: -0.3 }}>{children}</div>
    {sub && <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 3 }}>{sub}</div>}
  </div>
);

function BigChoiceSelector({ value, onChange, items, columns = 1 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: columns > 1 ? `repeat(${columns}, 1fr)` : "1fr", gap: 8 }}>
      {items.map((item, i) => {
        const active = value === i;
        const color = item.color || "#E8825A";
        return (
          <button key={i} onClick={() => onChange(i)} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: columns > 1 ? "14px 12px" : "16px 18px",
            borderRadius: 14, border: "2.5px solid",
            borderColor: active ? color : "#EDEDED",
            background: active ? `${color}0D` : "#FAFAFA",
            cursor: "pointer", width: "100%", textAlign: "left",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 13,
              background: active ? color : "#DDD", color: "#fff",
              fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center",
              justifyContent: "center", flexShrink: 0,
            }}>{i}</div>
            <span style={{
              fontSize: columns > 1 ? 14 : 15,
              color: active ? "#2D2D2D" : "#777", fontWeight: active ? 600 : 400,
            }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ value, onChange, min = 0, max = 20, unit = "次" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, justifyContent: "center" }}>
      <button onClick={() => onChange(Math.max(min, value - 1))} style={{
        width: 52, height: 52, borderRadius: 16, border: "2.5px solid #E0E0E0",
        background: "#FAFAFA", fontSize: 26, cursor: "pointer", color: "#888",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>−</button>
      <div style={{ textAlign: "center", minWidth: 56 }}>
        <div style={{ fontSize: 36, fontWeight: 800, color: "#2D2D2D" }}>{value}</div>
        <div style={{ fontSize: 13, color: "#A0A0A0", marginTop: -2 }}>{unit}</div>
      </div>
      <button onClick={() => onChange(Math.min(max, value + 1))} style={{
        width: 52, height: 52, borderRadius: 16, border: "2.5px solid #E8825A",
        background: "#FFF5EE", fontSize: 26, cursor: "pointer", color: "#E8825A",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>+</button>
    </div>
  );
}

function ToggleRow({ value, onChange, label, icon, activeColor = "#E8825A" }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      width: "100%", padding: "14px 16px", borderRadius: 14,
      border: "2.5px solid", borderColor: value ? activeColor : "#EDEDED",
      background: value ? `${activeColor}0A` : "#FAFAFA", cursor: "pointer",
    }}>
      <span style={{ fontSize: 15, color: value ? "#2D2D2D" : "#777", fontWeight: value ? 600 : 400 }}>
        {icon && <span style={{ marginRight: 8 }}>{icon}</span>}{label}
      </span>
      <div style={{
        width: 48, height: 28, borderRadius: 14, padding: 3,
        background: value ? activeColor : "#D5D5D5",
        display: "flex", alignItems: "center", justifyContent: value ? "flex-end" : "flex-start",
      }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }} />
      </div>
    </button>
  );
}

function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative", background: "#fff", borderRadius: "24px 24px 0 0",
        padding: "12px 20px 32px", maxHeight: "80vh", overflowY: "auto",
        maxWidth: 430, width: "100%", margin: "0 auto",
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#DDD", margin: "0 auto 16px" }} />
        {title && <div style={{ fontSize: 18, fontWeight: 700, color: "#2D2D2D", marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 40 }}>
      <div style={{ width: 32, height: 32, border: "3px solid #E8E4DF", borderTopColor: "#E8825A", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("login"); // login | register
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone || !password) { setError("请填写手机号和密码"); return; }
    setLoading(true);
    setError("");
    try {
      if (mode === "register") {
        await api.register(phone, password, nickname || `用户${phone.slice(-4)}`);
      } else {
        await api.login(phone, password);
      }
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", padding: "40px 24px",
      background: "linear-gradient(180deg, #FFF8F0, #F5F0EB)",
    }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: "#3D3028", letterSpacing: -0.5 }}>CareLine</h1>
        <p style={{ fontSize: 14, color: "#A09080", marginTop: 6 }}>化疗副作用管理 · 让记录更简单</p>
      </div>

      <Card>
        <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: 3, marginBottom: 20 }}>
          {[["login", "登录"], ["register", "注册"]].map(([m, label]) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
              background: mode === m ? "#fff" : "transparent",
              color: mode === m ? "#2D2D2D" : "#999",
              fontWeight: mode === m ? 600 : 400, fontSize: 14, cursor: "pointer",
              boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>{label}</button>
          ))}
        </div>

        {mode === "register" && (
          <input value={nickname} onChange={e => setNickname(e.target.value)}
            placeholder="昵称（选填）" style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              border: "2px solid #EDEDED", fontSize: 15, outline: "none",
              marginBottom: 10, fontFamily: "inherit", boxSizing: "border-box",
            }}
          />
        )}
        <input value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="手机号" type="tel" style={{
            width: "100%", padding: "14px 16px", borderRadius: 12,
            border: "2px solid #EDEDED", fontSize: 15, outline: "none",
            marginBottom: 10, fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
        <input value={password} onChange={e => setPassword(e.target.value)}
          placeholder="密码" type="password" style={{
            width: "100%", padding: "14px 16px", borderRadius: 12,
            border: "2px solid #EDEDED", fontSize: 15, outline: "none",
            marginBottom: 16, fontFamily: "inherit", boxSizing: "border-box",
          }}
        />

        {error && <div style={{ color: "#E53935", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", padding: "16px", borderRadius: 14, border: "none",
          background: loading ? "#CCC" : "linear-gradient(135deg, #E8825A, #F5A673)",
          color: "#fff", fontSize: 16, fontWeight: 700, cursor: loading ? "default" : "pointer",
          boxShadow: loading ? "none" : "0 4px 16px #E8825A40",
        }}>
          {loading ? "请稍候…" : (mode === "register" ? "注册" : "登录")}
        </button>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ONBOARDING: Create/Join Family + Setup Cycle
// ═══════════════════════════════════════════════════════════════════════
function OnboardingPage({ onComplete }) {
  const [step, setStep] = useState("family"); // family | cycle
  const [familyMode, setFamilyMode] = useState("create"); // create | join
  const [familyName, setFamilyName] = useState("我的家庭");
  const [role, setRole] = useState("caregiver");
  const [inviteCode, setInviteCode] = useState("");
  const [cycleNo, setCycleNo] = useState(1);
  const [startDate, setStartDate] = useState(toDateStr());
  const [lengthDays, setLengthDays] = useState(21);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdCode, setCreatedCode] = useState("");

  const handleFamily = async () => {
    setLoading(true); setError("");
    try {
      if (familyMode === "create") {
        const res = await api.createFamily(familyName, role);
        setCreatedCode(res.invite_code);
      } else {
        if (!inviteCode.trim()) { setError("请输入邀请码"); setLoading(false); return; }
        await api.joinFamily(inviteCode.trim(), role);
      }
      setStep("cycle");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCycle = async () => {
    setLoading(true); setError("");
    try {
      await api.createCycle(cycleNo, startDate, lengthDays);
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === "family") {
    return (
      <div style={{
        minHeight: "100vh", padding: "40px 24px",
        background: "linear-gradient(180deg, #FFF8F0, #F5F0EB)",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>👨‍👩‍👧</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#3D3028" }}>设置家庭空间</h2>
          <p style={{ fontSize: 13, color: "#A09080", marginTop: 6 }}>家人之间共享记录数据</p>
        </div>

        <Card>
          <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.04)", borderRadius: 14, padding: 3, marginBottom: 20 }}>
            {[["create", "创建家庭"], ["join", "加入家庭"]].map(([m, label]) => (
              <button key={m} onClick={() => setFamilyMode(m)} style={{
                flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                background: familyMode === m ? "#fff" : "transparent",
                color: familyMode === m ? "#2D2D2D" : "#999",
                fontWeight: familyMode === m ? 600 : 400, fontSize: 14, cursor: "pointer",
              }}>{label}</button>
            ))}
          </div>

          {familyMode === "create" ? (
            <input value={familyName} onChange={e => setFamilyName(e.target.value)}
              placeholder="家庭名称" style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                border: "2px solid #EDEDED", fontSize: 15, outline: "none",
                marginBottom: 16, fontFamily: "inherit", boxSizing: "border-box",
              }}
            />
          ) : (
            <input value={inviteCode} onChange={e => setInviteCode(e.target.value)}
              placeholder="输入邀请码 (如 CL-XXXX-XXXX)" style={{
                width: "100%", padding: "14px 16px", borderRadius: 12,
                border: "2px solid #EDEDED", fontSize: 15, outline: "none",
                marginBottom: 16, fontFamily: "inherit", boxSizing: "border-box",
                textTransform: "uppercase", letterSpacing: 1,
              }}
            />
          )}

          <SectionTitle sub="您在家庭中的角色">我的角色</SectionTitle>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            {[["caregiver", "👨‍⚕️", "家属/照护者"], ["patient", "🧑", "患者"]].map(([r, icon, label]) => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: "16px", borderRadius: 14, border: "2.5px solid",
                borderColor: role === r ? "#E8825A" : "#EDEDED",
                background: role === r ? "#FFF5EE" : "#FAFAFA",
                cursor: "pointer", textAlign: "center",
              }}>
                <div style={{ fontSize: 28 }}>{icon}</div>
                <div style={{ fontSize: 14, fontWeight: role === r ? 600 : 400, color: role === r ? "#E8825A" : "#777", marginTop: 6 }}>{label}</div>
              </button>
            ))}
          </div>

          {error && <div style={{ color: "#E53935", fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}

          <button onClick={handleFamily} disabled={loading} style={{
            width: "100%", padding: "16px", borderRadius: 14, border: "none",
            background: loading ? "#CCC" : "linear-gradient(135deg, #E8825A, #F5A673)",
            color: "#fff", fontSize: 16, fontWeight: 700, cursor: loading ? "default" : "pointer",
          }}>
            {loading ? "请稍候…" : "下一步"}
          </button>
        </Card>
      </div>
    );
  }

  // Step 2: Create cycle
  return (
    <div style={{
      minHeight: "100vh", padding: "40px 24px",
      background: "linear-gradient(180deg, #FFF8F0, #F5F0EB)",
    }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💊</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#3D3028" }}>设置当前疗程</h2>
        {createdCode && (
          <div style={{
            marginTop: 12, padding: "10px 16px", borderRadius: 12,
            background: "#E8F5E9", display: "inline-block",
          }}>
            <span style={{ fontSize: 12, color: "#43A047" }}>邀请码：</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#2E7D32", letterSpacing: 1 }}>{createdCode}</span>
            <div style={{ fontSize: 11, color: "#66BB6A", marginTop: 2 }}>把邀请码分享给家人即可加入</div>
          </div>
        )}
      </div>

      <Card>
        <SectionTitle>第几疗程</SectionTitle>
        <Stepper value={cycleNo} onChange={setCycleNo} min={1} max={30} unit="疗程" />

        <div style={{ marginTop: 20 }}>
          <SectionTitle>本疗程开始日期</SectionTitle>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{
            width: "100%", padding: "14px 16px", borderRadius: 12,
            border: "2px solid #EDEDED", fontSize: 15, outline: "none",
            fontFamily: "inherit", boxSizing: "border-box",
          }} />
        </div>

        <div style={{ marginTop: 20 }}>
          <SectionTitle sub="常见：14天或21天">疗程周期（天数）</SectionTitle>
          <div style={{ display: "flex", gap: 8 }}>
            {[14, 21, 28].map(d => (
              <button key={d} onClick={() => setLengthDays(d)} style={{
                flex: 1, padding: "12px", borderRadius: 12, border: "2.5px solid",
                borderColor: lengthDays === d ? "#E8825A" : "#EDEDED",
                background: lengthDays === d ? "#FFF5EE" : "#FAFAFA",
                fontSize: 16, fontWeight: lengthDays === d ? 700 : 400,
                color: lengthDays === d ? "#E8825A" : "#777", cursor: "pointer",
              }}>{d}天</button>
            ))}
          </div>
        </div>

        {error && <div style={{ color: "#E53935", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</div>}

        <button onClick={handleCycle} disabled={loading} style={{
          width: "100%", marginTop: 24, padding: "16px", borderRadius: 14, border: "none",
          background: loading ? "#CCC" : "linear-gradient(135deg, #E8825A, #F5A673)",
          color: "#fff", fontSize: 16, fontWeight: 700, cursor: loading ? "default" : "pointer",
        }}>
          {loading ? "请稍候…" : "开始使用"}
        </button>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  TAB BAR
// ═══════════════════════════════════════════════════════════════════════
const PATIENT_TABS = [
  { id: "home", icon: "🏠", label: "首页" },
  { id: "record", icon: "📝", label: "记录" },
  { id: "calendar", icon: "📅", label: "日历" },
  { id: "summary", icon: "📋", label: "疗程" },
];
const CARE_TABS = [
  { id: "home", icon: "🏠", label: "首页" },
  { id: "record", icon: "📝", label: "代填" },
  { id: "trend", icon: "📊", label: "趋势" },
  { id: "summary", icon: "📋", label: "就诊" },
];

function TabBar({ tabs, active, setActive, accent }) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430, display: "flex", background: "#fff",
      borderTop: "1px solid #F0F0F0", padding: "8px 0 env(safe-area-inset-bottom, 10px)", zIndex: 100,
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setActive(t.id)} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          gap: 3, padding: "2px 0", border: "none", background: "none", cursor: "pointer",
        }}>
          <span style={{ fontSize: 22, filter: active === t.id ? "none" : "grayscale(0.8)", opacity: active === t.id ? 1 : 0.45 }}>
            {t.icon}
          </span>
          <span style={{ fontSize: 10, fontWeight: active === t.id ? 700 : 400, color: active === t.id ? accent : "#AAA" }}>
            {t.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  STOOL QUICK SHEET
// ═══════════════════════════════════════════════════════════════════════
function StoolQuickSheet({ open, onClose, isPatient, onSaved }) {
  const [bristol, setBristol] = useState(null);
  const [blood, setBlood] = useState(false);
  const [mucus, setMucus] = useState(false);
  const [tenesmus, setTenesmus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.createStoolEvent({ bristol, blood, mucus, tenesmus });
      setSaved(true);
      if (onSaved) onSaved();
      setTimeout(() => {
        setSaved(false); setBristol(null); setBlood(false); setMucus(false); setTenesmus(false);
        onClose();
      }, 1000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={saved ? null : (isPatient ? "🚽 记录这一次" : "🚽 排便记录")}>
      {saved ? (
        <div style={{ textAlign: "center", padding: "20px 0 10px" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#5A3A28" }}>已记录</div>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#999", marginBottom: 10 }}>{isPatient ? "大便是什么样的？" : "Bristol 分型"}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {BRISTOL_SHORT.map((label, i) => (
                <button key={i} onClick={() => setBristol(i + 1)} style={{
                  padding: "12px 4px", borderRadius: 12, border: "2.5px solid",
                  borderColor: bristol === i + 1 ? "#E8825A" : "#EDEDED",
                  background: bristol === i + 1 ? "#FFF5EE" : "#FAFAFA", cursor: "pointer", textAlign: "center",
                }}>
                  <div style={{ fontSize: 20 }}>{BRISTOL_ICONS[i]}</div>
                  <div style={{ fontSize: 10, color: bristol === i + 1 ? "#E8825A" : "#888", marginTop: 4 }}>{label}</div>
                  {(i >= 3 && i <= 4) && <div style={{ fontSize: 8, color: "#43A047", fontWeight: 700 }}>正常</div>}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            <ToggleRow value={blood} onChange={setBlood} label="带血" icon="🩸" activeColor="#E05050" />
            <ToggleRow value={mucus} onChange={setMucus} label="黏液" icon="💧" activeColor="#E88050" />
            <ToggleRow value={tenesmus} onChange={setTenesmus} label={isPatient ? "总想上厕所" : "里急后重"} icon="🚻" activeColor="#E8A050" />
          </div>
          <button onClick={handleSave} disabled={saving} style={{
            width: "100%", padding: "18px", borderRadius: 16, border: "none",
            background: saving ? "#CCC" : "linear-gradient(135deg, #E8825A, #F5A673)",
            color: "#fff", fontSize: 16, fontWeight: 700, cursor: saving ? "default" : "pointer",
          }}>
            {saving ? "保存中…" : "记录完成"}
          </button>
        </>
      )}
    </BottomSheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  RECORD PAGE (patient: self-record, caregiver: 代填 mode)
// ═══════════════════════════════════════════════════════════════════════
function RecordPage({ isPatient, cycle, goBack }) {
  const accent = isPatient ? "#E8825A" : "#5B7FE8";
  const [energy, setEnergy] = useState(null);
  const [nausea, setNausea] = useState(null);
  const [appetite, setAppetite] = useState(null);
  const [sleep, setSleep] = useState(null);
  const [fever, setFever] = useState(false);
  const [tempC, setTempC] = useState("37.0");
  const [stoolCount, setStoolCount] = useState(2);
  const [diarrhea, setDiarrhea] = useState(null);
  const [numbness, setNumbness] = useState(false);
  const [mouthSore, setMouthSore] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingLog, setExistingLog] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(true);
  const [confirmed, setConfirmed] = useState(isPatient); // patient doesn't need confirmation
  const [debugInfo, setDebugInfo] = useState({});

  // Load existing today log on mount
  useEffect(() => {
    console.log("[代填] 正在查询今日记录...");

    // Also fetch family info for diagnostics
    api.getMyFamily().then(f => {
      console.log("[代填] 家庭信息:", f);
      setDebugInfo(prev => ({ ...prev, family: f }));
    }).catch(e => console.error("[代填] 家庭信息获取失败:", e));

    api.getToday()
      .then(log => {
        console.log("[代填] 查询结果:", JSON.stringify(log));
        setDebugInfo(prev => ({ ...prev, todayLog: log, todayLogRaw: JSON.stringify(log) }));
        setExistingLog(log);
        // Pre-fill form with existing data
        if (log) {
          console.log("[代填] 找到已有记录，预填数据");
          if (log.energy != null) setEnergy(log.energy);
          if (log.nausea != null) setNausea(log.nausea);
          if (log.appetite != null) setAppetite(log.appetite);
          if (log.sleep_quality != null) setSleep(log.sleep_quality);
          if (log.fever) { setFever(true); if (log.temp_c) setTempC(String(log.temp_c)); }
          if (log.stool_count != null) setStoolCount(log.stool_count);
          if (log.diarrhea != null) setDiarrhea(log.diarrhea);
          if (log.numbness) setNumbness(true);
          if (log.mouth_sore) setMouthSore(true);
          if (log.note) setNote(log.note);
          if (isPatient) setConfirmed(true);
        } else {
          console.log("[代填] 今日暂无记录");
          if (isPatient) setConfirmed(true);
        }
      })
      .catch((err) => {
        console.error("[代填] 查询失败:", err.message);
        // Still let them through, but with an error notice
        if (isPatient) setConfirmed(true);
      })
      .finally(() => setLoadingExisting(false));
  }, [isPatient]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.upsertDailyLog(toDateStr(), {
        energy, nausea, appetite, sleep_quality: sleep,
        fever, temp_c: fever ? parseFloat(tempC) : null,
        stool_count: stoolCount, diarrhea,
        numbness, mouth_sore: mouthSore,
        is_tough_day: false, note: note || null,
      });
      setSaved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingExisting) return <LoadingSpinner />;

  // Caregiver: show confirmation if patient already recorded today
  if (!isPatient && existingLog && !confirmed) {
    return (
      <div style={{ padding: "40px 20px 120px" }}>
        <Card style={{
          textAlign: "center", padding: "28px 24px",
          border: "2px solid #FFE0C0", background: "#FFFAF5",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#5A3A28", margin: "0 0 10px" }}>
            患者今天已经记录过了
          </h2>
          <p style={{ fontSize: 14, color: "#A09080", lineHeight: 1.6, marginBottom: 6 }}>
            {existingLog.is_tough_day ? "（使用了「今天很难受」快捷模式）" : ""}
          </p>

          {/* Show existing data summary */}
          <div style={{
            marginTop: 12, padding: "14px 16px", borderRadius: 12,
            background: "#fff", border: "1px solid #F0E8E0", textAlign: "left",
          }}>
            <div style={{ fontSize: 12, color: "#BBB", marginBottom: 8 }}>已记录的数据</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {existingLog.energy != null && (
                <div style={{ fontSize: 13, color: "#666" }}>💪 体力: {existingLog.energy}/4</div>
              )}
              {existingLog.nausea != null && (
                <div style={{ fontSize: 13, color: "#666" }}>🤢 恶心: {existingLog.nausea}/3</div>
              )}
              {existingLog.stool_count != null && (
                <div style={{ fontSize: 13, color: "#666" }}>🚽 排便: {existingLog.stool_count}次</div>
              )}
              {existingLog.fever && (
                <div style={{ fontSize: 13, color: "#E05050" }}>🌡️ 发热: {existingLog.temp_c}℃</div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <button onClick={() => setConfirmed(true)} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: "#5B7FE8", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}>
              我来补充/修改
            </button>
            <button onClick={goBack} style={{
              width: "100%", padding: "14px", borderRadius: 14,
              border: "2px solid #E0E0E0", background: "#fff",
              color: "#888", fontSize: 15, fontWeight: 500, cursor: "pointer",
            }}>
              不修改，返回
            </button>
          </div>

          <p style={{ fontSize: 11, color: "#C4A080", marginTop: 14 }}>
            修改后记录会标注"由家属代填/补充"
          </p>

          {/* Debug info - remove in production */}
          <div style={{ marginTop: 16, padding: 10, borderRadius: 8, background: "#F0F0F0", fontSize: 10, color: "#999", textAlign: "left", wordBreak: "break-all" }}>
            <div>🔍 诊断信息</div>
            <div>家庭ID: {debugInfo.family?.id || "未获取"}</div>
            <div>成员: {debugInfo.family?.members?.map(m => `${m.nickname}(${m.role})`).join(", ") || "?"}</div>
            <div>记录family_id: {existingLog?.family_id}</div>
          </div>
        </Card>
      </div>
    );
  }

  // Caregiver: patient hasn't recorded today yet
  if (!isPatient && !existingLog && !confirmed) {
    return (
      <div style={{ padding: "40px 20px 120px" }}>
        <Card style={{
          textAlign: "center", padding: "28px 24px",
          border: "2px solid #D8E0F0", background: "#F8FAFF",
        }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#2A3A5A", margin: "0 0 10px" }}>
            患者今天还没有记录
          </h2>
          <p style={{ fontSize: 14, color: "#8090A0", lineHeight: 1.6 }}>
            可以等患者自己填写，或由您替患者代填
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
            <button onClick={() => setConfirmed(true)} style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: "#5B7FE8", color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer",
            }}>
              我来替患者记录
            </button>
            <button onClick={goBack} style={{
              width: "100%", padding: "14px", borderRadius: 14,
              border: "2px solid #E0E0E0", background: "#fff",
              color: "#888", fontSize: 15, fontWeight: 500, cursor: "pointer",
            }}>
              等患者自己填
            </button>
          </div>

          <p style={{ fontSize: 11, color: "#B0B8C8", marginTop: 14 }}>
            代填的记录会标注为家属代填
          </p>

          {/* Debug info - remove in production */}
          <div style={{ marginTop: 16, padding: 10, borderRadius: 8, background: "#F0F0F0", fontSize: 10, color: "#999", textAlign: "left", wordBreak: "break-all" }}>
            <div>🔍 诊断信息（定位问题后删除）</div>
            <div>家庭ID: {debugInfo.family?.id || "未获取"}</div>
            <div>家庭名: {debugInfo.family?.name || "未获取"}</div>
            <div>我的角色: {debugInfo.family?.my_role || "未获取"}</div>
            <div>成员数: {debugInfo.family?.members?.length || "?"}</div>
            <div>成员: {debugInfo.family?.members?.map(m => `${m.nickname}(${m.role})`).join(", ") || "?"}</div>
            <div>API /daily/today 返回: {debugInfo.todayLogRaw ?? "loading..."}</div>
          </div>
        </Card>
      </div>
    );
  }

  if (saved) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>✅</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: isPatient ? "#5A3A28" : "#1A2A3A" }}>
          {isPatient ? "今天的记录完成了！" : "代填记录已保存"}
        </h2>
        <p style={{ fontSize: 14, color: "#A0A0A0", marginTop: 8 }}>
          {isPatient ? "辛苦了，好好休息 ☺️" : `第${cycle?.cycle_no || '?'}疗程数据已更新`}
        </p>
        <button onClick={goBack} style={{
          marginTop: 24, padding: "14px 36px", borderRadius: 14, border: "none",
          background: accent, color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer",
        }}>回到首页</button>
      </div>
    );
  }

  const today = new Date();
  const dayStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const energyItems = (isPatient ? ENERGY_PATIENT : ENERGY_CARE).map((l, i) => ({ label: l, color: ECOLORS[i] }));
  const nauseaItems = (isPatient ? NAUSEA_PATIENT : NAUSEA_CARE).map((l, i) => ({ label: l, color: NCOLORS[i] }));
  const diarrheaItems = ["没有", "轻度", "中度", "严重"].map((l, i) => ({ label: l, color: ["#43A047", "#FDD835", "#FB8C00", "#E53935"][i] }));

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: isPatient ? "#3D3028" : "#1A2A3A", margin: "8px 0 4px" }}>
        {isPatient ? "今天感觉怎么样？" : "替患者记录今天的状态"}
      </h2>
      <p style={{ fontSize: 13, color: "#A0A0A0", margin: "0 0 12px" }}>
        第{cycle?.cycle_no || '?'}疗程 · Day {cycle?.current_day || '?'} · {dayStr}
      </p>

      {/* Caregiver notice */}
      {!isPatient && (
        <div style={{
          padding: "10px 14px", borderRadius: 12, marginBottom: 14,
          background: "#EEF2F8", border: "1px solid #D8E0F0",
          fontSize: 13, color: "#5B7FE8", fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>👨‍⚕️</span>
          <span>代填模式 · 记录会标注为家属代填</span>
        </div>
      )}

      <Card style={{ marginBottom: 12 }}>
        <SectionTitle sub={isPatient ? "选最符合的一项" : "ECOG 0-4"}>💪 {isPatient ? "今天精神怎么样？" : "体力评分"}</SectionTitle>
        <BigChoiceSelector value={energy} onChange={setEnergy} items={energyItems} />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>🤢 {isPatient ? "胃舒不舒服？" : "恶心程度"}</SectionTitle>
        <BigChoiceSelector value={nausea} onChange={setNausea} items={nauseaItems} />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>🍚 {isPatient ? "今天胃口如何？" : "食欲"}</SectionTitle>
        <BigChoiceSelector value={appetite} onChange={setAppetite} items={APPETITE_LABELS.map(l => ({ label: l }))} columns={2} />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>😴 {isPatient ? "昨晚睡得好吗？" : "睡眠质量"}</SectionTitle>
        <BigChoiceSelector value={sleep} onChange={setSleep} items={SLEEP_LABELS.map(l => ({ label: l }))} columns={2} />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>🚽 {isPatient ? "今天上了几次厕所？" : "排便次数"}</SectionTitle>
        <Stepper value={stoolCount} onChange={setStoolCount} />
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>🌡️ 发热</SectionTitle>
        <ToggleRow value={fever} onChange={setFever} label={isPatient ? "今天有发热吗？" : "发热"} icon="🤒" activeColor="#E05050" />
        {fever && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
            <span style={{ fontSize: 15, color: "#888" }}>体温</span>
            <input type="number" step="0.1" value={tempC} onChange={e => setTempC(e.target.value)}
              style={{
                width: 90, padding: "12px", borderRadius: 12, border: "2.5px solid #E05050",
                fontSize: 22, fontWeight: 700, textAlign: "center", outline: "none",
                color: "#E05050", background: "#FFF5F5",
              }}
            />
            <span style={{ fontSize: 15, color: "#888" }}>℃</span>
          </div>
        )}
      </Card>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>{isPatient ? "其他不舒服的地方" : "副作用"}</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <ToggleRow value={numbness} onChange={setNumbness} label={isPatient ? "手脚有点麻" : "手足麻木"} icon="🤚" />
          <ToggleRow value={mouthSore} onChange={setMouthSore} label={isPatient ? "嘴巴里有溃疡" : "口腔溃疡"} icon="👄" />
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>{isPatient ? "肚子有没有拉？" : "腹泻程度"}</div>
          <BigChoiceSelector value={diarrhea} onChange={setDiarrhea} items={diarrheaItems} columns={2} />
        </div>
      </Card>
      <Card style={{ marginBottom: 18 }}>
        <SectionTitle>{isPatient ? "还有什么想说的？（选填）" : "备注（选填）"}</SectionTitle>
        <textarea value={note} onChange={e => setNote(e.target.value)}
          placeholder={isPatient ? "今天的感受、吃了什么…" : "补充说明…"}
          style={{
            width: "100%", minHeight: 80, padding: 14, borderRadius: 14,
            border: "2px solid #EDEDED", fontSize: 14, resize: "vertical",
            fontFamily: "inherit", outline: "none", boxSizing: "border-box",
          }}
        />
      </Card>
      <button onClick={handleSave} disabled={saving} style={{
        width: "100%", padding: "20px", borderRadius: 18, border: "none",
        background: saving ? "#CCC" : `linear-gradient(135deg, ${accent}, ${isPatient ? "#F5A673" : "#7B9FFF"})`,
        color: "#fff", fontSize: 18, fontWeight: 700, cursor: saving ? "default" : "pointer",
        boxShadow: saving ? "none" : `0 6px 20px ${accent}40`,
      }}>
        {saving ? "保存中…" : (isPatient ? "完成记录 ✅" : "保存代填记录")}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  TOUGH DAY PAGE (patient only)
// ═══════════════════════════════════════════════════════════════════════
function ToughDayPage({ goBack }) {
  const [fever, setFever] = useState(false);
  const [tempC, setTempC] = useState("37.5");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.upsertDailyLog(toDateStr(), {
        fever, temp_c: fever ? parseFloat(tempC) : null,
        is_tough_day: true,
      });
      setSaved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <div style={{ padding: "80px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 64, marginBottom: 12 }}>🫂</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#5A3A28" }}>记录好了，辛苦了</h2>
        <p style={{ fontSize: 14, color: "#A09080", marginTop: 8, lineHeight: 1.6 }}>今天好好休息<br/>身体在努力恢复中</p>
        <button onClick={goBack} style={{
          marginTop: 28, padding: "14px 36px", borderRadius: 14, border: "none",
          background: "#E8825A", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer",
        }}>回到首页</button>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>😔</div>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: "#5A3A28" }}>今天辛苦了</h2>
        <p style={{ fontSize: 14, color: "#A09080" }}>只需要回答一个问题就好</p>
      </div>
      <Card>
        <SectionTitle>🌡️ 今天有发热吗？</SectionTitle>
        <ToggleRow value={fever} onChange={setFever} label="有发热" icon="🤒" activeColor="#E05050" />
        {fever && (
          <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, justifyContent: "center" }}>
            <span style={{ fontSize: 15, color: "#888" }}>体温</span>
            <input type="number" step="0.1" value={tempC} onChange={e => setTempC(e.target.value)}
              style={{
                width: 90, padding: "12px", borderRadius: 12, border: "2.5px solid #E05050",
                fontSize: 22, fontWeight: 700, textAlign: "center", outline: "none", color: "#E05050", background: "#FFF5F5",
              }}
            />
            <span style={{ fontSize: 15, color: "#888" }}>℃</span>
          </div>
        )}
      </Card>
      <div style={{
        marginTop: 16, padding: "14px 18px", borderRadius: 14,
        background: "#FFF8F2", border: "1.5px solid #F5DCC8",
        fontSize: 13, color: "#B09070", lineHeight: 1.6, textAlign: "center",
      }}>
        其他指标会参考昨天的数据自动填充<br/>等身体好一些了再详细记录也可以
      </div>
      <button onClick={handleSave} disabled={saving} style={{
        width: "100%", marginTop: 20, padding: "18px", borderRadius: 18, border: "none",
        background: saving ? "#CCC" : "linear-gradient(135deg, #E8825A, #F5A673)",
        color: "#fff", fontSize: 17, fontWeight: 700, cursor: saving ? "default" : "pointer",
      }}>
        {saving ? "保存中…" : "记录完成"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  HOME PLACEHOLDER (uses API data)
// ═══════════════════════════════════════════════════════════════════════
function HomePage({ isPatient, cycle, setTab, setStoolOpen, messages }) {
  const accent = isPatient ? "#E8825A" : "#5B7FE8";
  const cycleDay = cycle?.current_day || 1;
  const pct = cycle ? Math.min(100, (cycleDay / cycle.length_days) * 100) : 0;
  const pastPeak = cycleDay > 7;
  const inWindow = cycleDay >= 3 && cycleDay <= 7;
  const today = new Date();
  const dayStr = `${today.getMonth() + 1}月${today.getDate()}日 · ${"日一二三四五六"[today.getDay()]}`;
  const activeMsg = messages && messages.length > 0 ? messages[0] : null;

  return (
    <div style={{ padding: "0 16px 120px" }}>
      <div style={{ padding: "16px 0 6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 14, color: isPatient ? "#B0A090" : "#8090A0" }}>{dayStr}</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: isPatient ? "#3D3028" : "#1A2A3A", margin: "4px 0 0" }}>
              {isPatient ? `今天是 Day ${cycleDay}` : "今日监测"}
            </h1>
          </div>
          {!isPatient && (
            <div style={{ background: "#EEF2F8", borderRadius: 12, padding: "8px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#5B7FE8", fontWeight: 600 }}>第{cycle?.cycle_no}疗程</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#5B7FE8" }}>Day {cycleDay}</div>
            </div>
          )}
        </div>
      </div>

      {/* Cycle progress */}
      <Card style={{
        marginTop: 10,
        background: isPatient ? "linear-gradient(135deg, #FFF9F4, #FFF3EB)" : "#fff",
        border: isPatient ? "1px solid #F5E0CC" : "none",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>第{cycle?.cycle_no || '?'}疗程进度</span>
          <span style={{ fontSize: 13, color: accent, fontWeight: 700 }}>{Math.round(pct)}%</span>
        </div>
        <div style={{ height: isPatient ? 12 : 8, background: isPatient ? "#F0E4DA" : "#E8ECF1", borderRadius: 6, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 6,
            background: isPatient ? "linear-gradient(90deg, #F5C28A, #E8825A)" : "linear-gradient(90deg, #5B7FE8, #7B9FFF)",
            width: `${pct}%`,
          }} />
        </div>
        {isPatient && (
          <div style={{
            marginTop: 12, padding: "10px 14px", borderRadius: 12, textAlign: "center",
          }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: pastPeak ? "#43A047" : "#C47040" }}>
              {pastPeak ? "最难的 Day 3–7 已经过去了 🎉" : inWindow ? "身体正在努力恢复中，加油 💪" : "状态平稳期"}
            </span>
          </div>
        )}
        {!isPatient && (
          <div style={{
            marginTop: 10, padding: "8px 12px", borderRadius: 8,
            background: inWindow ? "#FFF5E0" : "#E8F5E9",
            fontSize: 13, fontWeight: 600, color: inWindow ? "#C06020" : "#43A047",
          }}>
            {inWindow ? "⚠ Day 3–7 副作用高发窗口期" : "副作用窗口期外"}
          </div>
        )}
      </Card>

      {/* Family message (patient) */}
      {isPatient && activeMsg && (
        <Card style={{
          marginTop: 12, padding: "14px 18px",
          background: "linear-gradient(135deg, #FFF0F0, #FFF5F0)", border: "1px solid #FFE0D0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 28 }}>💌</span>
            <div>
              <div style={{ fontSize: 11, color: "#D08060", fontWeight: 600, marginBottom: 3 }}>家人留言</div>
              <div style={{ fontSize: 15, color: "#5A3A28", fontWeight: 500, lineHeight: 1.5 }}>{activeMsg.content}</div>
            </div>
          </div>
        </Card>
      )}

      {/* CTAs */}
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => setTab("record")} style={{
          width: "100%", padding: "20px", borderRadius: 18, border: "none",
          background: `linear-gradient(135deg, ${accent}, ${isPatient ? "#F5A673" : "#7B9FFF"})`,
          color: "#fff", fontSize: 18, fontWeight: 700, cursor: "pointer",
          boxShadow: `0 6px 20px ${accent}40`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <span style={{ fontSize: 24 }}>📝</span>{isPatient ? "记录今天的状态" : "替患者记录今天的状态"}
        </button>

        {isPatient && (
          <button onClick={() => setTab("tough")} style={{
            width: "100%", padding: "16px", borderRadius: 18, border: "2.5px solid #FFD0B0",
            background: "#FFF8F2", color: "#C47040", fontSize: 15, fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <span style={{ fontSize: 20 }}>😔</span>今天比较难受，简单记一下
          </button>
        )}
      </div>

      {/* Quick nav */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <button onClick={() => setTab(isPatient ? "calendar" : "trend")} style={{
          padding: 16, borderRadius: 14, border: "1.5px solid #E8E4DF", background: "#fff", cursor: "pointer", textAlign: "left",
        }}>
          <span style={{ fontSize: 24 }}>{isPatient ? "📅" : "📊"}</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#2D2D2D", marginTop: 6 }}>{isPatient ? "状态日历" : "趋势分析"}</div>
        </button>
        <button onClick={() => setTab("summary")} style={{
          padding: 16, borderRadius: 14, border: "1.5px solid #E8E4DF", background: "#fff", cursor: "pointer", textAlign: "left",
        }}>
          <span style={{ fontSize: 24 }}>📋</span>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#2D2D2D", marginTop: 6 }}>{isPatient ? "我的疗程" : "就诊摘要"}</div>
        </button>
      </div>

      {/* Patient floating stool button */}
      {isPatient && (
        <button onClick={() => setStoolOpen(true)} style={{
          position: "fixed", right: 20, bottom: 80,
          width: 62, height: 62, borderRadius: 20,
          background: "linear-gradient(135deg, #E8825A, #D06840)",
          color: "#fff", border: "none", cursor: "pointer",
          boxShadow: "0 4px 20px #E8825A50",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
          zIndex: 90, fontSize: 10, fontWeight: 600,
        }}>
          <span style={{ fontSize: 24 }}>🚽</span><span>记一次</span>
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  PATIENT: CALENDAR PAGE (real API integration)
// ═══════════════════════════════════════════════════════════════════════
function CalendarPage() {
  const [calData, setCalData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCalendar = useCallback(async () => {
    try {
      const now = new Date();
      const data = await api.getCalendar(now.getFullYear(), now.getMonth() + 1);
      setCalData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);

  if (loading) return <LoadingSpinner />;
  if (!calData) return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>暂无数据</div>;

  // Build calendar grid
  const firstDate = new Date(calData.year, calData.month - 1, 1);
  const firstDow = firstDate.getDay();
  const daysInMonth = new Date(calData.year, calData.month, 0).getDate();
  const todayDate = new Date().getDate();
  const todayMonth = new Date().getMonth() + 1;
  const isThisMonth = calData.month === todayMonth;

  const dayMap = {};
  (calData.days || []).forEach(d => {
    const dayNum = new Date(d.date).getDate();
    dayMap[dayNum] = d;
  });

  const weeks = [];
  let week = new Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(null); weeks.push(week); }

  const statusStyles = {
    good:  { bg: "#E8F5E9", border: "#A5D6A7" },
    okay:  { bg: "#FFF8E1", border: "#FFE082" },
    tough: { bg: "#FFF3E0", border: "#FFCC80" },
  };

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#3D3028", margin: "8px 0 4px" }}>📅 我的状态日历</h2>
      <p style={{ fontSize: 13, color: "#A09080", margin: "0 0 16px" }}>每天一个表情，看看这个月的状态</p>

      <Card style={{
        marginBottom: 16, padding: "16px 20px", textAlign: "center",
        background: "linear-gradient(135deg, #FFF9F4, #FFF3EB)", border: "1px solid #F5E0CC",
      }}>
        <div style={{ fontSize: 15, color: "#5A3A28", fontWeight: 600 }}>
          已记录 <span style={{ fontSize: 22, fontWeight: 800, color: "#E8825A" }}>{calData.total_recorded}</span> 天，
          其中 <span style={{ fontSize: 22, fontWeight: 800, color: "#43A047" }}>{calData.good_days}</span> 天状态不错 😊
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#5A3A28", textAlign: "center", marginBottom: 14 }}>
          {calData.year}年{calData.month}月
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 }}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, color: "#B0B0B0", fontWeight: 500, padding: "4px 0" }}>{d}</div>
          ))}
        </div>
        {weeks.map((wk, wi) => (
          <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
            {wk.map((d, di) => {
              const info = d ? dayMap[d] : null;
              const isToday = isThisMonth && d === todayDate;
              const conf = info ? statusStyles[info.status] : null;
              return (
                <div key={di} style={{
                  height: 48, borderRadius: 10, display: "flex",
                  flexDirection: "column", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", padding: "2px 0",
                  background: conf ? conf.bg : (d ? "#FAFAFA" : "transparent"),
                  border: isToday ? "2.5px solid #E8825A" : `1.5px solid ${conf ? conf.border : "transparent"}`,
                }}>
                  {d && (
                    <>
                      <span style={{ fontSize: 10, lineHeight: 1, color: isToday ? "#E8825A" : "#B0B0B0", fontWeight: isToday ? 700 : 400 }}>{d}</span>
                      {info?.emoji && <span style={{ fontSize: 14, lineHeight: 1.2 }}>{info.emoji}</span>}
                      {info?.cycle_day && <span style={{ fontSize: 7, lineHeight: 1, color: "#C4A080" }}>D{info.cycle_day}</span>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "center", gap: 16, marginTop: 14,
          paddingTop: 12, borderTop: "1px solid #F0F0F0",
        }}>
          {[{ emoji: "😊", label: "状态不错" }, { emoji: "😐", label: "还可以" }, { emoji: "💪", label: "在坚持" }].map(l => (
            <div key={l.emoji} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#888" }}>
              <span style={{ fontSize: 16 }}>{l.emoji}</span>{l.label}
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginTop: 12, textAlign: "center", padding: "16px" }}>
        <div style={{ fontSize: 14, color: "#A09080" }}>连续记录</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#E8825A", margin: "4px 0" }}>{calData.streak} 天</div>
        <div style={{ fontSize: 13, color: "#C4A080" }}>这些数据会帮到医生了解你的情况 🙏</div>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CAREGIVER: TREND PAGE (real API integration + recharts)
// ═══════════════════════════════════════════════════════════════════════
function TrendPage({ cycle }) {
  const [metric, setMetric] = useState("nausea");
  const [logs, setLogs] = useState([]);
  const [prevLogs, setPrevLogs] = useState([]);
  const [showPrev, setShowPrev] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cycle) return;
    setLoading(true);
    api.getCycleLogs(cycle.cycle_no)
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
    // Also try to load previous cycle
    if (cycle.cycle_no > 1) {
      api.getCycleLogs(cycle.cycle_no - 1).then(setPrevLogs).catch(() => {});
    }
  }, [cycle?.cycle_no]);

  const metrics = [
    { id: "nausea", label: "恶心", max: 3, key: "nausea", color: "#FB8C00" },
    { id: "energy", label: "体力", max: 4, key: "energy", color: "#7B5FD8" },
    { id: "stool", label: "排便", max: 8, key: "stool_count", color: "#0288D1" },
    { id: "diarrhea", label: "腹泻", max: 3, key: "diarrhea", color: "#E53935" },
  ];
  const m = metrics.find(x => x.id === metric);

  const prevMap = {};
  prevLogs.forEach(l => { if (l.cycle_day) prevMap[l.cycle_day] = l; });

  const chartData = logs.map(l => ({
    day: `D${l.cycle_day || '?'}`,
    value: l[m.key] ?? null,
    ...(showPrev && prevMap[l.cycle_day] ? { prev: prevMap[l.cycle_day][m.key] ?? null } : {}),
  }));

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A2A3A", margin: "8px 0 4px" }}>📊 副作用趋势</h2>
      <p style={{ fontSize: 13, color: "#8090A0", margin: "0 0 14px" }}>
        第{cycle?.cycle_no}疗程 · 按化疗天数对齐
      </p>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 14 }}>
        {metrics.map(mt => (
          <button key={mt.id} onClick={() => setMetric(mt.id)} style={{
            padding: "8px 16px", borderRadius: 20, border: "none",
            background: metric === mt.id ? mt.color : "#fff",
            color: metric === mt.id ? "#fff" : "#777",
            fontSize: 13, fontWeight: metric === mt.id ? 700 : 400,
            cursor: "pointer", whiteSpace: "nowrap",
            boxShadow: metric === mt.id ? `0 2px 8px ${mt.color}40` : "0 1px 4px rgba(0,0,0,0.05)",
          }}>{mt.label}</button>
        ))}
      </div>
      <Card>
        <div style={{ height: 220 }}>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={m.color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#AAA" }} />
                <YAxis domain={[0, m.max]} tick={{ fontSize: 11, fill: "#AAA" }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 2px 12px rgba(0,0,0,0.1)", fontSize: 13 }} />
                <Area type="monotone" dataKey="value" stroke={m.color} strokeWidth={2.5}
                  fill="url(#gVal)" dot={{ r: 4, fill: m.color, stroke: "#fff", strokeWidth: 2 }} name={m.label} />
                {showPrev && (
                  <Area type="monotone" dataKey="prev" stroke="#CCC" strokeWidth={1.5}
                    strokeDasharray="5 5" fill="none" dot={{ r: 3, fill: "#CCC" }} name="上疗程" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#BBB" }}>
              暂无数据，记录后会自动显示
            </div>
          )}
        </div>
      </Card>
      {prevLogs.length > 0 && (
        <Card style={{ marginTop: 12 }}>
          <ToggleRow value={showPrev} onChange={setShowPrev}
            label={`显示上疗程对比（第${(cycle?.cycle_no || 1) - 1}疗程）`} icon="📈" activeColor="#5B7FE8" />
        </Card>
      )}
    </div>
  );
}

function SummaryPage({ isPatient, cycle }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const mode = isPatient ? 'patient' : 'caregiver';
    api.getSummary(cycle?.cycle_no, 14, mode)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [cycle?.cycle_no, isPatient]);

  if (loading) return <LoadingSpinner />;

  const text = summary?.summary_text || "暂无数据，开始记录后会自动生成摘要";
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }).catch(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (isPatient) {
    const pct = cycle ? Math.round(((cycle.current_day || 1) / cycle.length_days) * 100) : 0;
    return (
      <div style={{ padding: "16px 16px 120px" }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: "#3D3028", margin: "8px 0 16px" }}>📋 我的疗程</h2>
        <Card style={{ textAlign: "center", padding: "28px 24px", background: "linear-gradient(135deg, #FFF9F4, #FFF3EB)", border: "1px solid #F5E0CC" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
          <div style={{ fontSize: 14, color: "#B09070" }}>第{cycle?.cycle_no}疗程 · Day {cycle?.current_day}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#5A3A28", margin: "10px 0" }}>疗程已完成 {pct}%</div>
          <div style={{ height: 10, background: "#F0E4DA", borderRadius: 5, overflow: "hidden", margin: "8px 0 16px" }}>
            <div style={{ height: "100%", borderRadius: 5, background: "linear-gradient(90deg, #F5C28A, #E8825A)", width: `${pct}%` }} />
          </div>
          <div style={{ fontSize: 15, color: "#C47040", fontWeight: 600, lineHeight: 1.7 }}>
            最近状态在慢慢恢复中<br/>继续加油 💪
          </div>
        </Card>
        <Card style={{ marginTop: 14, textAlign: "center", padding: 16 }}>
          <div style={{ fontSize: 13, color: "#A09080", lineHeight: 1.6 }}>
            详细数据已同步给家属<br/>就诊时家属可以直接分享给医生
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 120px" }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#1A2A3A", margin: "8px 0 4px" }}>📋 就诊摘要</h2>
      <p style={{ fontSize: 13, color: "#8090A0", margin: "0 0 14px" }}>一键复制发给医生</p>
      <Card style={{ border: "1.5px solid #E0E4EA" }}>
        <pre style={{
          margin: 0, fontFamily: `"PingFang SC", sans-serif`, whiteSpace: "pre-wrap",
          wordBreak: "break-all", fontSize: 13, lineHeight: 1.7, color: "#333",
        }}>{text}</pre>
      </Card>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button onClick={handleCopy} style={{
          flex: 1, padding: 16, borderRadius: 14, border: "none",
          background: copied ? "#43A047" : "#5B7FE8", color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: "pointer",
        }}>{copied ? "已复制 ✅" : "📋 一键复制"}</button>
        <button style={{
          flex: 1, padding: 16, borderRadius: 14, border: "2.5px solid #5B7FE8",
          background: "transparent", color: "#5B7FE8", fontSize: 15, fontWeight: 700, cursor: "pointer",
        }}>💬 微信分享</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function App() {
  const [appState, setAppState] = useState("loading"); // loading | login | onboarding | main
  const [user, setUser] = useState(null);
  const [family, setFamily] = useState(null);
  const [cycle, setCycle] = useState(null);
  const [tab, setTab] = useState("home");
  const [stoolOpen, setStoolOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(k => k + 1);

  const isPatient = family?.my_role === "patient";
  const accent = isPatient ? "#E8825A" : "#5B7FE8";

  // Bootstrap: check auth → family → cycle
  const bootstrap = useCallback(async () => {
    if (!api.token) { setAppState("login"); return; }
    try {
      const me = await api.getMe();
      setUser(me);
      try {
        const fam = await api.getMyFamily();
        setFamily(fam);
        try {
          const cy = await api.getCurrentCycle();
          setCycle(cy);
          // Load messages
          try { const msgs = await api.getActiveMessages(); setMessages(msgs); } catch {}
          setAppState("main");
        } catch {
          setAppState("onboarding");
        }
      } catch {
        setAppState("onboarding");
      }
    } catch {
      api.clearToken();
      setAppState("login");
    }
  }, []);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  if (appState === "loading") {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "linear-gradient(180deg, #FFF8F0, #F5F0EB)",
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
        <LoadingSpinner />
        <p style={{ fontSize: 14, color: "#A09080", marginTop: 12 }}>加载中…</p>
      </div>
    );
  }

  if (appState === "login") {
    return <LoginPage onLogin={bootstrap} />;
  }

  if (appState === "onboarding") {
    return <OnboardingPage onComplete={bootstrap} />;
  }

  // Main app
  const tabs = isPatient ? PATIENT_TABS : CARE_TABS;

  const renderPage = () => {
    if (tab === "tough" && isPatient) return <ToughDayPage goBack={() => { triggerRefresh(); setTab("home"); }} />;
    if (tab === "record") return <RecordPage isPatient={isPatient} cycle={cycle} goBack={() => { triggerRefresh(); setTab("home"); }} />;
    if (tab === "home") return <HomePage isPatient={isPatient} cycle={cycle} setTab={setTab} setStoolOpen={setStoolOpen} messages={messages} />;
    if (tab === "calendar" && isPatient) return <CalendarPage key={refreshKey} />;
    if (tab === "trend" && !isPatient) return <TrendPage cycle={cycle} key={refreshKey} />;
    if (tab === "summary") return <SummaryPage isPatient={isPatient} cycle={cycle} key={refreshKey} />;
    return <HomePage isPatient={isPatient} cycle={cycle} setTab={setTab} setStoolOpen={setStoolOpen} messages={messages} />;
  };

  return (
    <div style={{
      fontFamily: `"PingFang SC", "Noto Sans SC", -apple-system, sans-serif`,
      minHeight: "100vh", maxWidth: 430, margin: "0 auto", position: "relative",
      background: isPatient
        ? "linear-gradient(180deg, #FFF8F0 0%, #F8F3EE 20%, #F5F0EB 50%)"
        : "linear-gradient(180deg, #F0F4FA 0%, #EAF0F8 20%, #E8ECF1 50%)",
    }}>
      {/* Header */}
      <div style={{ padding: "10px 16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: isPatient ? "#C47040" : "#4A6FD8" }}>CareLine</span>
          <span style={{
            fontSize: 9, padding: "2px 6px", borderRadius: 4,
            background: isPatient ? "#FFF0E5" : "#E8EEF8",
            color: isPatient ? "#C47040" : "#4A6FD8", fontWeight: 700,
          }}>{isPatient ? "患者端" : "家属端"}</span>
        </div>
        <span style={{ fontSize: 12, color: "#BBB" }}>{user?.nickname || ""}</span>
      </div>

      {renderPage()}

      <TabBar tabs={tabs} active={tab === "tough" ? "home" : tab} setActive={setTab} accent={accent} />

      <StoolQuickSheet open={stoolOpen} onClose={() => setStoolOpen(false)} isPatient={isPatient} onSaved={triggerRefresh} />
    </div>
  );
}
