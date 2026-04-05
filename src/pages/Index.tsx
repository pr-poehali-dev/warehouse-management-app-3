import { useState } from "react";
import Icon from "@/components/ui/icon";

const OBJECTS = [
  { id: "OBJ-001", name: "Склад №3, Москва", type: "Склад", status: "active", address: "ул. Складская, 12", events: 14, lastEvent: "2 ч назад" },
  { id: "OBJ-002", name: "Офис — Питер", type: "Офис", status: "active", address: "Невский пр., 88", events: 7, lastEvent: "вчера" },
  { id: "OBJ-003", name: "Торговая точка Юг", type: "Розница", status: "maintenance", address: "ул. Южная, 3", events: 2, lastEvent: "3 д назад" },
  { id: "OBJ-004", name: "Производство — Тверь", type: "Производство", status: "active", address: "Пром. зона, корпус 4", events: 31, lastEvent: "10 мин назад" },
  { id: "OBJ-005", name: "Склад №7, Казань", type: "Склад", status: "inactive", address: "ул. Индустриальная, 5", events: 0, lastEvent: "—" },
];

const EVENTS = [
  { id: 1, objectId: "OBJ-004", objectName: "Производство — Тверь", type: "Инспекция", desc: "Плановая проверка оборудования", user: "А. Смирнов", time: "10 мин назад", severity: "info" },
  { id: 2, objectId: "OBJ-001", objectName: "Склад №3, Москва", type: "Инцидент", desc: "Превышение температурного режима в секции B", user: "Система", time: "2 ч назад", severity: "warning" },
  { id: 3, objectId: "OBJ-002", objectName: "Офис — Питер", type: "Обновление", desc: "Обновлены контактные данные арендатора", user: "М. Козлова", time: "вчера, 17:42", severity: "info" },
  { id: 4, objectId: "OBJ-004", objectName: "Производство — Тверь", type: "Документ", desc: "Загружен акт приёмки оборудования", user: "И. Петров", time: "вчера, 14:10", severity: "success" },
  { id: 5, objectId: "OBJ-001", objectName: "Склад №3, Москва", type: "Инцидент", desc: "Зафиксирован несанкционированный доступ", user: "Система", time: "3 д назад", severity: "error" },
  { id: 6, objectId: "OBJ-003", objectName: "Торговая точка Юг", type: "Обслуживание", desc: "Начало регламентного обслуживания СКУД", user: "Сервис-группа", time: "3 д назад", severity: "info" },
];

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

type Section = "objects" | "events";

export default function Index() {
  const [section, setSection] = useState<Section>("objects");
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const activeObj = OBJECTS.find((o) => o.id === selectedObject);

  const filteredObjects = OBJECTS.filter((o) => {
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    const matchSearch =
      search === "" ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.type.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const objectEvents = selectedObject
    ? EVENTS.filter((e) => e.objectId === selectedObject)
    : EVENTS;

  const stats = {
    total: OBJECTS.length,
    active: OBJECTS.filter((o) => o.status === "active").length,
    events: EVENTS.length,
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
            onClick={() => { setSection("objects"); setSelectedObject(null); }}
          >
            <Icon name="Building2" size={15} />
            <span>Объекты</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{stats.total}</span>
          </button>
          <button
            className={`sidebar-link ${section === "events" ? "active" : ""}`}
            onClick={() => { setSection("events"); setSelectedObject(null); }}
          >
            <Icon name="Activity" size={15} />
            <span>События</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">{stats.events}</span>
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
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center px-6 gap-4 bg-card shrink-0">
          <div className="flex-1">
            {section === "objects" && !selectedObject && (
              <h1 className="text-sm font-medium">Реестр объектов</h1>
            )}
            {section === "objects" && selectedObject && (
              <div className="flex items-center gap-2 text-sm">
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setSelectedObject(null)}
                >
                  Реестр объектов
                </button>
                <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                <span className="font-medium">{activeObj?.name}</span>
              </div>
            )}
            {section === "events" && <h1 className="text-sm font-medium">Лента событий</h1>}
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

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">

          {/* === OBJECTS LIST === */}
          {section === "objects" && !selectedObject && (
            <div className="animate-fade-in">
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: "Всего объектов", value: stats.total, icon: "Building2" },
                  { label: "Активных", value: stats.active, icon: "CheckCircle2" },
                  { label: "Событий за 30 дней", value: stats.events, icon: "Activity" },
                ].map((s, i) => (
                  <div key={i} className="stat-card flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-2xl font-light font-mono">{s.value}</p>
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
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">ID</th>
                      <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Объект</th>
                      <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Тип</th>
                      <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Статус</th>
                      <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">События</th>
                      <th className="text-left text-xs text-muted-foreground font-medium px-4 py-3">Последнее событие</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredObjects.map((obj, i) => (
                      <tr
                        key={obj.id}
                        className="border-b border-border last:border-0 hover:bg-secondary/40 transition-colors cursor-pointer"
                        style={{ animationDelay: `${i * 0.04}s` }}
                        onClick={() => setSelectedObject(obj.id)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">{obj.id}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{obj.name}</p>
                          <p className="text-xs text-muted-foreground">{obj.address}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{obj.type}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`tag ${STATUS_MAP[obj.status].color}`}>
                            {STATUS_MAP[obj.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm">{obj.events}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">{obj.lastEvent}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Icon name="ChevronRight" size={14} className="text-muted-foreground" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredObjects.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground text-sm">
                    Объекты не найдены
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === OBJECT DETAIL === */}
          {section === "objects" && selectedObject && activeObj && (
            <div className="animate-fade-in max-w-4xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-muted-foreground">{activeObj.id}</span>
                    <span className={`tag ${STATUS_MAP[activeObj.status].color}`}>
                      {STATUS_MAP[activeObj.status].label}
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

              <div className="bg-card border border-border rounded-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">История событий</p>
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">Экспорт</button>
                </div>
                {objectEvents.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">Событий пока нет</div>
                ) : objectEvents.map((ev) => {
                  const sev = SEVERITY_MAP[ev.severity];
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
                {EVENTS.map((ev, i) => {
                  const sev = SEVERITY_MAP[ev.severity];
                  return (
                    <div
                      key={ev.id}
                      className="flex items-start gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-secondary/30 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-col items-center gap-1 pt-0.5">
                        <Icon name={sev.icon} size={16} className={sev.color} />
                        {i < EVENTS.length - 1 && (
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

        </div>
      </main>
    </div>
  );
}
