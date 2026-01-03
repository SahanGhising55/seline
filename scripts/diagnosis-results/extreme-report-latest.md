# EXTREME Vector Search Diagnosis Report
Generated: 2025-12-25T21:27:20.522Z
Total Tests: 300

## Summary by Configuration

| Config | Pass | Partial | Fail | Avg Coverage | Avg Hits | Score |
|--------|------|---------|------|--------------|----------|-------|
| v1-baseline-strict | 11 | 5 | 4 | 64% | 10.0 | 0.584 |
| v1-baseline-normal | 12 | 5 | 3 | 70% | 15.0 | 0.680 |
| v1-baseline-loose | 13 | 4 | 3 | 74% | 20.0 | 0.764 |
| v1-ultra-loose | 14 | 3 | 3 | 76% | 50.0 | 0.791 |
| hybrid-balanced | 16 | 2 | 2 | 84% | 20.0 | 0.859 |
| hybrid-semantic-heavy | 16 | 2 | 2 | 84% | 20.0 | 0.859 |
| hybrid-lexical-heavy | 16 | 2 | 2 | 84% | 20.0 | 0.859 |
| hybrid-extreme-lexical | 18 | 1 | 1 | 91% | 30.0 | 0.926 |
| hybrid-low-rrfk | 16 | 2 | 2 | 84% | 20.0 | 0.859 |
| hybrid-high-rrfk | 16 | 2 | 2 | 84% | 20.0 | 0.859 |
| hybrid-with-expansion | 15 | 3 | 2 | 83% | 20.0 | 0.837 |
| hybrid-with-rerank | 16 | 2 | 2 | 84% | 20.0 | 0.859 |
| optimal-v1 | 13 | 4 | 3 | 74% | 30.0 | 0.764 |
| optimal-v2 | 18 | 1 | 1 | 91% | 30.0 | 0.926 |
| optimal-v3-max-recall | 18 | 1 | 1 | 93% | 50.0 | 0.933 |

## Summary by Difficulty

| Difficulty | Avg Coverage | Best Config | Worst Config |
|------------|--------------|-------------|--------------|
| MEDIUM | 98% | v1-baseline-loose | v1-baseline-strict |
| HARD | 97% | hybrid-balanced | v1-baseline-strict |
| EXTREME | 65% | optimal-v3-max-recall | v1-baseline-strict |

## 🏆 Top Recommendations

1. **optimal-v3-max-recall** (score: 0.933)
   - minScore: 0.01, topK: 50
   - {"enableHybridSearch":true,"searchMode":"hybrid","denseWeight":1,"lexicalWeight":2,"rrfK":50}

2. **hybrid-extreme-lexical** (score: 0.926)
   - minScore: 0.05, topK: 30
   - {"enableHybridSearch":true,"searchMode":"hybrid","denseWeight":0.1,"lexicalWeight":5,"rrfK":20}

3. **optimal-v2** (score: 0.926)
   - minScore: 0.05, topK: 30
   - {"enableHybridSearch":true,"searchMode":"hybrid","denseWeight":2,"lexicalWeight":1,"rrfK":40}
