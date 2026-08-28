# 顺期健身app

女性周期与情绪自适应训练 Web MVP。核心闭环：

建档与分层授权 → 每日状态打卡 → 确定性安全检查 → 可解释计划 → 逐组训练 → 真实反馈 → 保守洞察。

产品边界：顺期健身app 是训练辅助工具，不提供诊断、治疗、排卵确认或避孕判断。

## 本轮 V0.3 优化

- 情绪改为五档手动选择；日记只保存供用户回看，不发送给模型、不自动分析。
- 周期分为自然、激素使用、不规律、未启用四种模式；不足两个完整间隔不显示具体阶段。
- 训练优先级固定为安全 > 疼痛/症状 > 睡眠/恢复 > 情绪/能量 > 历史/目标 > 周期背景。
- 计划与教练替换都强制校验动作来源、经验、器械、伤病和今天可用时长。
- 加入逐组完成、组间计时、部分训练、停止原因和逐动作日志。
- 加入 HttpOnly 设备私有会话、授权撤回、单篇/单条删除、完整 JSON 导出与全量删除。
- 前端采用 Refero Ease Health 临床植物系风格，桌面/移动端响应式，并支持 reduced motion。

## 启动

后端：

~~~bash
cd backend
python3.11 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
~~~

前端：

~~~bash
cd frontend
npm install
npm run dev
~~~

打开 http://127.0.0.1:3001 。前端通过 Next.js rewrite 同源代理 /api 到 127.0.0.1:8000。

## 验证

~~~bash
cd backend
.venv/bin/python -m pytest -q

cd ../frontend
npm run typecheck
npm run build
~~~

本轮自动化覆盖安全红旗、周期模式降级、手动情绪、隐私 opt-out、会话归属、完整导出/删除、准备度、器械/伤病/难度过滤、短时计划和 API 主链路。测试环境禁止调用真实模型。

## 关键目录

~~~text
backend/app/api/routes.py          API、会话、数据控制
backend/app/services/              安全、周期、准备度、计划、教练、验证器
backend/app/data/                  可审校动作库与规则 JSON
backend/tests/                     服务与 API 自动化测试
frontend/app/                      七个产品页面
frontend/components/              设计系统与导航
frontend/lib/api.ts                集中 API 类型与错误处理
docs/技术适配声明_V0.2.md
docs/前端技术适配声明_V0.2.md
docs/竞品与设计取证.md
THIRD_PARTY_NOTICES.md
~~~

## AI 与敏感数据

- 规则引擎、红旗拦截、计划构造、动作替换和校验不依赖 LLM。
- 无模型 Key 时，调整理由使用确定性规则文案；主链路仍可工作。
- 教练只接收结构化训练上下文。
- 日记原文、备注原文、精确经期日期和访问令牌不会进入模型提示词。
- 本轮没有调用真实付费模型；上线前应按受控冒烟流程验证成本、超时和脱敏。

## 生产差距

当前仍是可完整验收的 Web MVP，不等于生产完成。正式上线前需要 PostgreSQL + Alembic、正式账号恢复/多设备登录、CSRF 和速率限制、Sentry/trace、运动科学评审、Playwright 旅程测试以及真实模型受控冒烟。详见 docs/技术适配声明_V0.2.md。
