# CycleFit AI · 女性周期与情绪自适应训练助手

第一阶段 MVP：最小核心链路「建档 → 每日 Check-in（含心情）→ 生成可解释、可替换的训练计划（情绪不好时附带固定模板暖心安慰）→ 训练反馈」。

> 情绪安慰为**固定模板**，不调模型、不做情绪分析、不做诊断；计划结构/安全/准备度均为确定性规则，LLM 仅用于把"调整原因"润色成自然语言（失败自动降级为规则文案）。

## 目录结构

```
cyclefit/
├── backend/
│   ├── app/
│   │   ├── api/routes.py          # API 路由
│   │   ├── core/config.py, db.py  # 配置（.env）、数据库
│   │   ├── models/                # SQLAlchemy 模型
│   │   ├── schemas/               # Pydantic 输入输出
│   │   ├── services/              # 安全/准备度/安慰/计划引擎/验证器/LLM
│   │   │   └── prompts/           # Prompt 模板
│   │   ├── data/                  # 动作库与规则（JSON，可配置、可审校）
│   │   ├── static/index.html      # 临时验收界面
│   │   └── main.py
│   ├── tests/                     # mock 自动化测试 + API 冒烟
│   ├── requirements.txt
│   └── .env.example               # 模板（真实 .env 不入库）
├── data/                          # SQLite 数据库文件（不入库）
└── docs/                          # PRD / 手册 / 技术适配声明副本
```

## 启动

```bash
cd backend
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env            # 填入 DEEPSEEK_API_KEY
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

打开 http://127.0.0.1:8000/ 使用临时验收界面（建档 → Check-in → 看计划 → 反馈）。

## 前端（第二阶段，正式前端）

```bash
cd frontend
npm install
npm run dev        # 默认 http://localhost:3000（端口被占会自动换端口）
```

前端通过 `rewrites` 把 `/api/*` 同源代理到后端（`BACKEND_URL` 环境变量，默认 `http://127.0.0.1:8000`），需先启动后端。

页面：`/`（今日：Check-in→计划+暖心安慰→反馈）、`/onboarding`（建档）、`/insights`（洞察）、`/profile`（数据导出/删除）。

```bash
npm run typecheck   # 类型检查
npm run build       # 生产构建（standalone）
```

设计系统：整体风格借鉴 Kikin（森林绿+暖奶油+草绿强调+超窄展示字），交互模式借鉴 TWOMUCH（药丸控件/单一强调色/细线分隔），温暖适配 Ease Health（奶油上的植物温室）。详见 `frontend/app/globals.css` 的 `@theme` tokens。

## 运行测试

```bash
cd backend
.venv/bin/python -m pytest tests/ -q
```

测试含：安全红旗 / 准备度 / 固定暖心安慰 / 计划引擎（器械过滤、伤病屏蔽、时长裁剪）/ 计划验证器 / API 全链路（mock 环境，不调真实模型）。

## 真实模型冒烟（验收前必做）

```bash
cd backend
# 确认 .env 已填真实 DEEPSEEK_API_KEY，然后：
.venv/bin/python -m uvicorn app.main:app --port 8000 &
curl -s -X POST http://127.0.0.1:8000/api/v1/checkin -H 'Content-Type: application/json' \
  -d '{"profile_id":1,"available_minutes":40,"energy":3,"sleep_hours":6,"soreness":2,"pain":"none","mood":"low","red_flags":[]}'
# 预期：rationale_text 为模型生成的温柔解释；无 Key 时自动降级为规则文案
```

## 关键设计说明

- **动作库准确性**：`app/data/exercises.json` 为手工审校的 21 个常见力量动作，肌肉/器械/分类术语对齐 wger（开放健身数据库）标准分类法；中文名手工翻译。字段含主/次发力肌群、器械（OR 语义=任一可选）、难度、居家友好标记、替换动作组（swap_group）。
- **业务规则可配置（未冻结）**：准备度权重/阈值、安全红旗清单、暖心话模板、动作库均为 JSON 文件，后续经运动科学评审冻结后**只改配置不改代码**。
- **强制底线**：密钥只存 `.env`（已 gitignore）、计划必须过验证器、红旗症状直接停止并建议就医、错误不泄露堆栈、日志用 reason_code。
- **双层测试**：mock 单测（离线）+ 真实 DeepSeek 冒烟（验收前）。

## 数据来源与许可说明

- 动作库为**独立手工审校**内容，仅术语分类法对齐 wger；未复制 wger 数据条目，不涉及 AGPL 数据复用。
- 竞品借鉴（无代码复制）：workout-cool（MIT，双语动作字段/属性表/RPE）、Moon Lift（本地 LLM 按感受生成计划）、powHER / donutworkout（周期自适应强度+支持性话术）、YouPeriod.app（本地优先隐私）。
