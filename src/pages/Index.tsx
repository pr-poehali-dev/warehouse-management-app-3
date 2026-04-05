import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const API = {
  objects: "https://functions.poehali.dev/a6456d33-38a3-4c15-8766-fa23bb2fc801",
  events: "https://functions.poehali.dev/4f885d24-5481-4fbd-bdf5-5bf2192069ea",
  integrations: "https://functions.poehali.dev/fbd40825-17a7-4c54-a39c-f180966a934a",
  warehouse: "https://functions.poehali.dev/821c9477-3751-4ae6-b5df-258adc558f9d",
};

interface Obj {
  id: number;
  code: string;
  name: string;
  type: string;
  status: string;
  address: string;
  events: number;
  lastEvent: string;
  integrations: string[];
}

interface Evt {
  id: number;
  objectId: number;
  objectCode: string;
  objectName: string;
  type: string;
  desc: string;
  user: string;
  severity: string;
  time: string;
}

interface Intg {
  id: number;
  name: string;
  icon: string;
  status: string;
  lastSync: string;
  objects: number;
}

interface WarehouseItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  updatedAt: string;
  low: boolean;
}

interface WarehouseTx {
  id: number;
  itemId: number;
  itemName: string;
  unit: string;
  objectId: number | null;
  objectName: string | null;
  objectCode: string | null;
  type: string;
  quantity: number;
  user: string;
  note: string;
  time: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Активен", color: "bg-emerald-100 text-emerald-700" },
  maintenance: { label: "Обслуживание", color: "bg-amber-100 text-amber-700" },
  inactive: { label: "Не активен", color: "bg-gray-100 text-gray-500" },
};

const SEVERITY_MAP: Record<string, { icon: string; color: string }> = {
  info: { icon: "Info", color: "text-blue-500" },
  warning: { icon: "AlertTriangle", color: "text-amber-500" },
  error: { icon: "AlertCircle", color: "text-red-500" },
  success: { icon: "CheckCircle", color: "text-emerald-500" },
};

type Section = "objects" | "events" | "integrations" | "warehouse";

function useApi<T>(url: string, key: string, deps: unknown[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const json = await res.json();
      const parsed = typeof json === "string" ? JSON.parse(json) : json;
      setData(parsed[key] || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [url, key]);

  useEffect(() => { load(); }, [load, ...deps]);

  return { data, loading, reload: load };
}

export default function Index() {
  const [section, setSection] = useState<Section>("objects");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Склад: формы
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showOutcomeForm, setShowOutcomeForm] = useState(false);
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [warehouseTab, setWarehouseTab] = useState<"items" | "history">("items");
  const [incomeForm, setIncomeForm] = useState({ item_id: "", quantity: "", user_name: "Администратор", note: "" });
  const [outcomeForm, setOutcomeForm] = useState({ item_id: "", object_id: "", quantity: "", user_name: "", note: "" });
  const [addItemForm, setAddItemForm] = useState({ name: "", category: "", unit: "шт", quantity: "", min_quantity: "" });
  const [txLoading, setTxLoading] = useState(false);

  const { data: objects, loading: objLoading } = useApi<Obj>(API.objects, "objects");
  const { data: allEvents, loading: evtLoading } = useApi<Evt>(API.events, "events");
  const { data: integrations, loading: intgLoading } = useApi<Intg>(API.integrations, "integrations");
  const { data: warehouseItems, loading: whLoading, reload: reloadWh } = useApi<WarehouseItem>(API.warehouse, "items");
  const { data: warehouseTxs, loading: txsLoading, reload: reloadTxs } = useApi<WarehouseTx>(API.warehouse + "/tx", "transactions");

  const handleIncome = async () => {
    if (!incomeForm.item_id || !incomeForm.quantity) return;
    setTxLoading(true);
    await fetch(API.warehouse + "/tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...incomeForm, type: "income", quantity: Number(incomeForm.quantity) }),
    });
    setTxLoading(false);
    setShowIncomeForm(false);
    setIncomeForm({ item_id: "", quantity: "", user_name: "Администратор", note: "" });
    reloadWh(); reloadTxs();
  };

  const handleOutcome = async () => {
    if (!outcomeForm.item_id || !outcomeForm.quantity || !outcomeForm.object_id) return;
    setTxLoading(true);
    const res = await fetch(API.warehouse + "/tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...outcomeForm, type: "outcome", quantity: Number(outcomeForm.quantity) }),
    });
    const json = await res.json();
    const parsed = typeof json === "string" ? JSON.parse(json) : json;
    setTxLoading(false);
    if (parsed.error) { alert(parsed.error); return; }
    setShowOutcomeForm(false);
    setOutcomeForm({ item_id: "", object_id: "", quantity: "", user_name: "", note: "" });
    reloadWh(); reloadTxs();
  };

  const handleAddItem = async () => {
    if (!addItemForm.name) return;
    setTxLoading(true);
    await fetch(API.warehouse, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...addItemForm, quantity: Number(addItemForm.quantity || 0), min_quantity: Number(addItemForm.min_quantity || 0) }),
    });
    setTxLoading(false);
    setShowAddItemForm(false);
    setAddItemForm({ name: "", category: "", unit: "шт", quantity: "", min_quantity: "" });
    reloadWh(); reloadTxs();
  };

  const activeObj = objects.find((o) => o.id === selectedId);

  const filteredObjects = objects.filter((o) => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const matchSearch =
      search === "" ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.type.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const objectEvents = selectedId
    ? allEvents.filter((e) => e.objectId === selectedId)
    : allEvents;

  const stats = {
    total: objects.length,
    active: objects.filter((o) => o.status === "active").length,
    events: allEvents.length,
    integrations: integrations.filter((i) => i.status === "connected").length,
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col py-6 px-3 shrink-0 bg-card">
        <div className="px-3 mb-8">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 bg-foreground rounded-sm flex items-center justify-center">
              <Icon name="Building2" size={11} className="text-background" />
            </div>
            <span className="text-sm font-semibold tracking-tight">ObjectFlow</span>
          </div>
          <p className="text-xs text-muted-foreground font-light pl-7">управление объектами</p>
        </div>

        <nav className="flex flex-col gap-0.5">
          <button
            className={`sidebar-link ${section === "objects" ? "active" : ""}`}
            onClick={() => { setSection("objects"); setSelectedId(null); }}
          >
            <Icon name="Building2" size={15} />
            <span>Объекты</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{stats.total}</span>
          </button>
          <button
            className={`sidebar-link ${section === "events" ? "active" : ""}`}
            onClick={() => { setSection("events"); setSelectedId(null); }}
          >
            <Icon name="Activity" size={15} />
            <span>События</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{stats.events}</span>
          </button>
          <button
            className={`sidebar-link ${section === "warehouse" ? "active" : ""}`}
            onClick={() => { setSection("warehouse"); setSelectedId(null); }}
          >
            <Icon name="Package" size={15} />
            <span>Склад</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{warehouseItems.length}</span>
          </button>
          <button
            className={`sidebar-link ${section === "integrations" ? "active" : ""}`}
            onClick={() => { setSection("integrations"); setSelectedId(null); }}
          >
            <Icon name="Plug" size={15} />
            <span>Интеграции</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{stats.integrations}</span>
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-0.5">
          <div className="sidebar-link">
            <Icon name="Settings" size={15} />
            <span>Настройки</span>
          </div>
          <div className="sidebar-link">
            <Icon name="HelpCircle" size={15} />
            <span>Поддержка</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border flex items-center px-6 gap-4 bg-card shrink-0">
          <div className="flex-1">
            {section === "objects" && !selectedId && (
              <h1 className="text-sm font-medium">Реестр объектов</h1>
            )}
            {section === "objects" && selectedId && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setSelectedId(null)}
                >
                  Реестр объектов
                </button>
                <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                <span className="font-medium">{activeObj?.name}</span>
              </div>
            )}
            {section === "events" && <h1 className="text-sm font-medium">Лента событий</h1>}
            {section === "integrations" && <h1 className="text-sm font-medium">Интеграции</h1>}
            {section === "warehouse" && <h1 className="text-sm font-medium">Склад</h1>}
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-sm hover:bg-secondary">
              <Icon name="Bell" size={14} />
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
            </button>
            <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-medium">
              АС
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">

          {/* === OBJECTS LIST === */}
          {section === "objects" && !selectedId && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Всего объектов", value: stats.total, icon: "Building2" },
                  { label: "Активных", value: stats.active, icon: "CheckCircle2" },
                  { label: "Событий", value: stats.events, icon: "Activity" },
                  { label: "Интеграций", value: stats.integrations, icon: "Plug" },
                ].map((s, i) => (
                  <div key={i} className="stat-card flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-2xl font-light font-mono">
                        {objLoading ? <span className="text-muted-foreground text-base">…</span> : s.value}
                      </p>
                    </div>
                    <Icon name={s.icon} size={16} className="text-muted-foreground mt-0.5" />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="relative flex-1 max-w-xs">
                  <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Поиск по объектам..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex gap-1">
                  {[
                    { key: "all", label: "Все" },
                    { key: "active", label: "Активные" },
                    { key: "maintenance", label: "Обслуживание" },
                    { key: "inactive", label: "Не активные" },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilterStatus(f.key)}
                      className={`px-3 py-1.5 text-xs rounded-sm transition-all ${
                        filterStatus === f.key
                          ? "bg-foreground text-background"
                          : "bg-card border border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity">
                  <Icon name="Plus" size={13} />
                  Добавить объект
                </button>
              </div>

              <div className="bg-card border border-border rounded-sm overflow-hidden">
                {objLoading ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">Загрузка…</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">ID</th>
                        <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Объект</th>
                        <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Тип</th>
                        <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Статус</th>
                        <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">События</th>
                        <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Последнее</th>
                        <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Интеграции</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredObjects.map((obj) => (
                        <tr
                          key={obj.id}
                          className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer"
                          onClick={() => setSelectedId(obj.id)}
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-muted-foreground">{obj.code}</span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">{obj.name}</p>
                            <p className="text-xs text-muted-foreground">{obj.address}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{obj.type}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`tag ${(STATUS_MAP[obj.status] || STATUS_MAP.inactive).color}`}>
                              {(STATUS_MAP[obj.status] || STATUS_MAP.inactive).label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm">{obj.events}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{obj.lastEvent}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1 flex-wrap">
                              {obj.integrations.length === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : obj.integrations.map((intg) => (
                                <span key={intg} className="tag bg-secondary text-foreground">{intg}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!objLoading && filteredObjects.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">Объекты не найдены</div>
                )}
              </div>
            </div>
          )}

          {/* === OBJECT DETAIL === */}
          {section === "objects" && selectedId && activeObj && (
            <div className="animate-fade-in max-w-4xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{activeObj.code}</span>
                    <span className={`tag ${(STATUS_MAP[activeObj.status] || STATUS_MAP.inactive).color}`}>
                      {(STATUS_MAP[activeObj.status] || STATUS_MAP.inactive).label}
                    </span>
                  </div>
                  <h2 className="text-xl font-light">{activeObj.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{activeObj.address}</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-card border border-border rounded-sm hover:bg-secondary transition-colors">
                    <Icon name="Pencil" size={13} />
                    Редактировать
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity">
                    <Icon name="Plus" size={13} />
                    Добавить событие
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="stat-card">
                  <p className="text-xs text-muted-foreground mb-1">Тип объекта</p>
                  <p className="text-sm font-medium">{activeObj.type}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs text-muted-foreground mb-1">Событий всего</p>
                  <p className="text-2xl font-light font-mono">{activeObj.events}</p>
                </div>
                <div className="stat-card">
                  <p className="text-xs text-muted-foreground mb-1">Последнее событие</p>
                  <p className="text-sm font-medium">{activeObj.lastEvent}</p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-sm p-4 mb-4">
                <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Подключённые интеграции</p>
                {activeObj.integrations.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon name="Plug" size={14} />
                    <span>Нет активных интеграций</span>
                    <button className="ml-auto text-xs underline underline-offset-2 hover:text-foreground transition-colors">Подключить</button>
                  </div>
                ) : (
                  <div className="flex gap-2 flex-wrap">
                    {activeObj.integrations.map((intg) => (
                      <div key={intg} className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-sm text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {intg}
                      </div>
                    ))}
                    <button className="px-3 py-1.5 border border-dashed border-border rounded-sm text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all">
                      + Добавить
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-card border border-border rounded-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">История событий</p>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">Экспорт</button>
                </div>
                {evtLoading ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">Загрузка…</div>
                ) : objectEvents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">Событий пока нет</div>
                ) : objectEvents.map((ev) => {
                  const sev = SEVERITY_MAP[ev.severity] || SEVERITY_MAP.info;
                  return (
                    <div key={ev.id} className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                      <Icon name={sev.icon} size={15} className={`mt-0.5 shrink-0 ${sev.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium">{ev.type}</span>
                          <span className="text-xs text-muted-foreground">{ev.user}</span>
                        </div>
                        <p className="text-sm text-foreground/80">{ev.desc}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{ev.time}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === EVENTS === */}
          {section === "events" && (
            <div className="animate-fade-in max-w-3xl">
              <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1 max-w-xs">
                  <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Поиск по событиям..."
                    className="w-full pl-8 pr-3 py-2 text-sm bg-card border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-muted-foreground"
                  />
                </div>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-card border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Icon name="Filter" size={13} />
                  Фильтр
                </button>
                <button className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity">
                  <Icon name="Plus" size={13} />
                  Новое событие
                </button>
              </div>

              <div className="bg-card border border-border rounded-sm overflow-hidden">
                {evtLoading ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">Загрузка…</div>
                ) : allEvents.map((ev, i) => {
                  const sev = SEVERITY_MAP[ev.severity] || SEVERITY_MAP.info;
                  return (
                    <div
                      key={ev.id}
                      className="flex items-start gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <Icon name={sev.icon} size={16} className={sev.color} />
                        {i < allEvents.length - 1 && (
                          <div className="w-px h-6 bg-border"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{ev.type}</span>
                          <span className="text-xs text-muted-foreground">{ev.objectName}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{ev.time}</span>
                        </div>
                        <p className="text-sm">{ev.desc}</p>
                        <p className="text-xs text-muted-foreground mt-1">{ev.user}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === INTEGRATIONS === */}
          {section === "integrations" && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-muted-foreground">Управляйте подключениями к внешним системам</p>
                <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity">
                  <Icon name="Plus" size={13} />
                  Подключить систему
                </button>
              </div>

              {intgLoading ? (
                <div className="py-12 text-center text-muted-foreground text-sm">Загрузка…</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {integrations.map((intg) => (
                    <div
                      key={intg.id}
                      className="bg-card border border-border rounded-sm p-4 hover:border-foreground/20 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-9 h-9 bg-secondary rounded-sm flex items-center justify-center">
                          <Icon name={intg.icon} size={16} className="text-foreground" />
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${intg.status === "connected" ? "bg-emerald-500" : "bg-gray-300"}`}></span>
                          <span className="text-xs text-muted-foreground">
                            {intg.status === "connected" ? "Подключено" : "Не подключено"}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-sm font-medium mb-0.5">{intg.name}</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {intg.status === "connected"
                          ? `${intg.objects} объект${intg.objects !== 1 ? "а" : ""} · синхр. ${intg.lastSync}`
                          : "Интеграция не настроена"}
                      </p>
                      <button
                        className={`w-full py-1.5 text-xs rounded-sm transition-all border ${
                          intg.status === "connected"
                            ? "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                            : "border-foreground bg-foreground text-background hover:opacity-90"
                        }`}
                      >
                        {intg.status === "connected" ? "Настроить" : "Подключить"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 bg-card border border-border rounded-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Code2" size={15} />
                  <h3 className="text-sm font-medium">API-доступ</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Подключайте любые внешние системы через REST API. Документация и ключи доступны в разделе настроек.
                </p>
                <div className="flex items-center gap-2 bg-secondary rounded-sm px-3 py-2">
                  <span className="font-mono text-xs text-muted-foreground">https://api.objectflow.ru/v1/</span>
                  <button className="ml-auto">
                    <Icon name="Copy" size={13} className="text-muted-foreground hover:text-foreground transition-colors" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* === WAREHOUSE === */}
          {section === "warehouse" && (
            <div className="animate-fade-in">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3 mb-5">
                <div className="stat-card flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Позиций на складе</p>
                    <p className="text-2xl font-light font-mono">{whLoading ? "…" : warehouseItems.length}</p>
                  </div>
                  <Icon name="Package" size={16} className="text-muted-foreground mt-0.5" />
                </div>
                <div className="stat-card flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Заканчивается</p>
                    <p className="text-2xl font-light font-mono text-amber-600">{warehouseItems.filter(i => i.low).length}</p>
                  </div>
                  <Icon name="AlertTriangle" size={16} className="text-amber-500 mt-0.5" />
                </div>
                <div className="stat-card flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Операций</p>
                    <p className="text-2xl font-light font-mono">{warehouseTxs.length}</p>
                  </div>
                  <Icon name="ArrowLeftRight" size={16} className="text-muted-foreground mt-0.5" />
                </div>
                <div className="stat-card flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Списаний</p>
                    <p className="text-2xl font-light font-mono">{warehouseTxs.filter(t => t.type === "outcome").length}</p>
                  </div>
                  <Icon name="TrendingDown" size={16} className="text-muted-foreground mt-0.5" />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1">
                  <button
                    onClick={() => setWarehouseTab("items")}
                    className={`px-3 py-1.5 text-xs rounded-sm transition-all ${warehouseTab === "items" ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    Товары
                  </button>
                  <button
                    onClick={() => setWarehouseTab("history")}
                    className={`px-3 py-1.5 text-xs rounded-sm transition-all ${warehouseTab === "history" ? "bg-foreground text-background" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    История операций
                  </button>
                </div>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => { setShowIncomeForm(true); setShowOutcomeForm(false); setShowAddItemForm(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-card border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="TrendingUp" size={13} />
                    Приход
                  </button>
                  <button
                    onClick={() => { setShowOutcomeForm(true); setShowIncomeForm(false); setShowAddItemForm(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-card border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon name="TrendingDown" size={13} />
                    Списание на объект
                  </button>
                  <button
                    onClick={() => { setShowAddItemForm(true); setShowIncomeForm(false); setShowOutcomeForm(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-foreground text-background rounded-sm hover:opacity-90 transition-opacity"
                  >
                    <Icon name="Plus" size={13} />
                    Добавить товар
                  </button>
                </div>
              </div>

              {/* Форма прихода */}
              {showIncomeForm && (
                <div className="bg-card border border-border rounded-sm p-4 mb-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium uppercase tracking-wider">Приход товара</p>
                    <button onClick={() => setShowIncomeForm(false)}><Icon name="X" size={14} className="text-muted-foreground" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Товар</label>
                      <select
                        value={incomeForm.item_id}
                        onChange={e => setIncomeForm(f => ({ ...f, item_id: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                      >
                        <option value="">Выберите товар…</option>
                        {warehouseItems.map(i => (
                          <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Количество</label>
                      <input type="number" min="1" value={incomeForm.quantity}
                        onChange={e => setIncomeForm(f => ({ ...f, quantity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Кто вносит</label>
                      <input type="text" value={incomeForm.user_name}
                        onChange={e => setIncomeForm(f => ({ ...f, user_name: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="Администратор"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-xs text-muted-foreground mb-1 block">Примечание</label>
                      <input type="text" value={incomeForm.note}
                        onChange={e => setIncomeForm(f => ({ ...f, note: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="Закупка, поставка…"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleIncome}
                        disabled={txLoading || !incomeForm.item_id || !incomeForm.quantity}
                        className="w-full py-2 text-xs bg-foreground text-background rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        {txLoading ? "…" : "Оформить приход"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Форма списания */}
              {showOutcomeForm && (
                <div className="bg-card border border-border rounded-sm p-4 mb-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium uppercase tracking-wider">Списание на объект</p>
                    <button onClick={() => setShowOutcomeForm(false)}><Icon name="X" size={14} className="text-muted-foreground" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Товар</label>
                      <select
                        value={outcomeForm.item_id}
                        onChange={e => setOutcomeForm(f => ({ ...f, item_id: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                      >
                        <option value="">Выберите товар…</option>
                        {warehouseItems.map(i => (
                          <option key={i.id} value={i.id}>{i.name} — остаток: {i.quantity} {i.unit}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Объект</label>
                      <select
                        value={outcomeForm.object_id}
                        onChange={e => setOutcomeForm(f => ({ ...f, object_id: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                      >
                        <option value="">Выберите объект…</option>
                        {objects.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Количество</label>
                      <input type="number" min="1" value={outcomeForm.quantity}
                        onChange={e => setOutcomeForm(f => ({ ...f, quantity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Работник</label>
                      <input type="text" value={outcomeForm.user_name}
                        onChange={e => setOutcomeForm(f => ({ ...f, user_name: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="Имя работника"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Примечание / что установлено</label>
                      <input type="text" value={outcomeForm.note}
                        onChange={e => setOutcomeForm(f => ({ ...f, note: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="Монтаж датчиков в секции A…"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleOutcome}
                        disabled={txLoading || !outcomeForm.item_id || !outcomeForm.quantity || !outcomeForm.object_id}
                        className="w-full py-2 text-xs bg-foreground text-background rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        {txLoading ? "…" : "Списать"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Форма добавления товара */}
              {showAddItemForm && (
                <div className="bg-card border border-border rounded-sm p-4 mb-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium uppercase tracking-wider">Новый товар</p>
                    <button onClick={() => setShowAddItemForm(false)}><Icon name="X" size={14} className="text-muted-foreground" /></button>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Название</label>
                      <input type="text" value={addItemForm.name}
                        onChange={e => setAddItemForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="Датчик температуры…"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Категория</label>
                      <input type="text" value={addItemForm.category}
                        onChange={e => setAddItemForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="Датчики, Провода…"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Ед. изм.</label>
                      <input type="text" value={addItemForm.unit}
                        onChange={e => setAddItemForm(f => ({ ...f, unit: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="шт"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Нач. количество</label>
                      <input type="number" min="0" value={addItemForm.quantity}
                        onChange={e => setAddItemForm(f => ({ ...f, quantity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Мин. остаток</label>
                      <input type="number" min="0" value={addItemForm.min_quantity}
                        onChange={e => setAddItemForm(f => ({ ...f, min_quantity: e.target.value }))}
                        className="w-full px-3 py-2 text-sm bg-background border border-border rounded-sm outline-none focus:ring-1 focus:ring-foreground/20"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddItem}
                        disabled={txLoading || !addItemForm.name}
                        className="w-full py-2 text-xs bg-foreground text-background rounded-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
                      >
                        {txLoading ? "…" : "Добавить"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Таблица товаров */}
              {warehouseTab === "items" && (
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  {whLoading ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">Загрузка…</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Товар</th>
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Категория</th>
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Ед.</th>
                          <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Остаток</th>
                          <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Мин.</th>
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Обновлён</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouseItems.map(item => (
                          <tr key={item.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {item.low && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>}
                                <span className="text-sm">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{item.category || "—"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{item.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-mono text-sm font-medium ${item.low ? "text-amber-600" : ""}`}>{item.quantity}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-mono text-xs text-muted-foreground">{item.minQuantity}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{item.updatedAt}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* История операций */}
              {warehouseTab === "history" && (
                <div className="bg-card border border-border rounded-sm overflow-hidden">
                  {txsLoading ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">Загрузка…</div>
                  ) : warehouseTxs.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground text-sm">Операций пока нет</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Тип</th>
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Товар</th>
                          <th className="text-right text-xs text-muted-foreground font-medium px-4 py-3">Кол-во</th>
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Объект</th>
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Работник</th>
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Примечание</th>
                          <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Когда</th>
                        </tr>
                      </thead>
                      <tbody>
                        {warehouseTxs.map(tx => (
                          <tr key={tx.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className={`tag ${tx.type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                {tx.type === "income" ? "Приход" : "Списание"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm">{tx.itemName}</span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <span className={`font-mono text-sm font-medium ${tx.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                                {tx.type === "income" ? "+" : "−"}{tx.quantity} {tx.unit}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{tx.objectName || "—"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{tx.user || "—"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{tx.note || "—"}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{tx.time}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}