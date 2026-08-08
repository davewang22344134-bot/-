# 德州扑克胜率/牌力建模工具

输入手牌和公共牌，使用蒙特卡洛模拟估算胜率、平局率、牌力与改进空间。

启动方式：

```powershell
python -m http.server 8766 --bind 127.0.0.1 --directory hold-em-equity-tool
```

然后访问 `http://127.0.0.1:8766`。

功能：

- 选择 2 张手牌和 0-5 张公共牌。
- 设置 1-8 个对手、500-50000 次模拟。
- 使用蒙特卡洛随机补全未知公共牌和对手手牌，输出胜/平/负概率和 equity。
- 在已有至少 5 张牌时计算最佳 5 张牌型。
- 翻牌/转牌阶段显示一张牌改进 outs。
- 显示模拟牌型分布。
- 已内置从 `joogollucci/poker-hands-dataset` 聚合出的 `kaggle-model.json`，共 1,000,000 行、507 个起手牌阶段桶。
- 支持重新导入 Kaggle CSV，更新起手牌阶段牌型分布。

CSV 导入约定：

工具会优先识别 Kaggle 原始列名：

- `hand`
- `flop`
- `result1`
- `turn`
- `result2`
- `river`
- `result3`

也会识别常见胜负样本列名：

- 手牌列：`card1`/`card2`、`hole1`/`hole2`、`p1`/`p2` 或 `c1`/`c2`
- 结果列：`result`、`win`、`won`、`winner`、`label` 或 `target`

牌面格式支持 `As`、`Ah`、`Td`、`10c`、`A♠`，也支持 Kaggle 里的 `♠A` 这类格式。结果值 `1`、`true`、`win`、`won` 会按胜利计入。

如果 Kaggle 数据集字段不同，可以先在表格软件里把列名改成上述格式再导入。
