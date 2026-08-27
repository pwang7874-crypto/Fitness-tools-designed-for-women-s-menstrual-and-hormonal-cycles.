# -*- coding: utf-8 -*-
"""测试环境：隔离数据库 + 禁用真实模型（确保离线可跑）。"""
import os
import sys
import tempfile
from pathlib import Path

# 必须在导入 app 之前设置
_tmp = tempfile.mkdtemp(prefix="cyclefit_test_")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["DEEPSEEK_API_KEY"] = ""  # 测试阶段不调真实模型

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
