package com.example.beetle;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import javax.servlet.http.HttpServletRequest;
import java.util.*;

@RestController
@RequestMapping("/api/batches")
public class BatchController {

    @Autowired
    private BeetleRepository beetleRepository;

    @Autowired
    private CostRecordRepository costRepository;

    @Autowired
    private JwtUtils jwtUtils;

    private Long getUserId(HttpServletRequest request) {
        String token = request.getHeader("Authorization");
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
            return jwtUtils.getUserIdFromToken(token);
        }
        return null;
    }

    private String normalizeDate(String value) {
        if (value == null || value.trim().isEmpty()) return "";
        String trimmed = value.trim();
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^(\\d{4})[-/年](\\d{1,2})[-/月](\\d{1,2})")
                .matcher(trimmed);
        if (matcher.find()) {
            int month = Integer.parseInt(matcher.group(2));
            int day = Integer.parseInt(matcher.group(3));
            return String.format("%s-%02d-%02d", matcher.group(1), month, day);
        }
        return trimmed.length() >= 10 ? trimmed.substring(0, 10) : trimmed;
    }

    private String maxDate(String current, String candidate) {
        String next = normalizeDate(candidate);
        if (next.isEmpty()) return current == null ? "" : current;
        if (current == null || current.trim().isEmpty()) return next;
        return next.compareTo(current) > 0 ? next : current;
    }

    private String minDate(String current, String candidate) {
        String next = normalizeDate(candidate);
        if (next.isEmpty()) return current == null ? "" : current;
        if (current == null || current.trim().isEmpty()) return next;
        return next.compareTo(current) < 0 ? next : current;
    }

    private String getBeetleSortDate(Beetle beetle) {
        String latest = "";
        latest = maxDate(latest, beetle.getHatchDate());
        latest = maxDate(latest, beetle.getEmergenceDate());
        latest = maxDate(latest, beetle.getCreatedAt());
        return latest;
    }

    private String getCostSortDate(CostRecord cost) {
        String latest = "";
        latest = maxDate(latest, cost.getRecordDate());
        latest = maxDate(latest, cost.getCreatedAt());
        return latest;
    }

    private String getBeetleBatchStartDate(Beetle beetle) {
        String start = "";
        start = minDate(start, beetle.getHatchDate());
        start = minDate(start, beetle.getEmergenceDate());
        start = minDate(start, beetle.getCreatedAt());
        return start;
    }

    private String getCostBatchStartDate(CostRecord cost) {
        String start = "";
        start = minDate(start, cost.getRecordDate());
        start = minDate(start, cost.getCreatedAt());
        return start;
    }

    private void touchBatchStartDate(Map<String, Object> map, String date) {
        String current = (String) map.getOrDefault("batchStartDate", "");
        map.put("batchStartDate", minDate(current, date));
    }

    @GetMapping("/summary")
    public List<Map<String, Object>> getBatchSummary(HttpServletRequest request) {
        Long userId = getUserId(request);
        List<Beetle> beetles = beetleRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<CostRecord> costs = costRepository.findByUserIdOrderByCreatedAtDesc(userId);

        Map<String, Map<String, Object>> batchMap = new HashMap<>();

        for (Beetle b : beetles) {
            String bName = b.getBatchName();
            if (bName == null || bName.trim().isEmpty()) {
                bName = "无批次";
            }
            batchMap.putIfAbsent(bName, new HashMap<>());
            Map<String, Object> map = batchMap.get(bName);
            map.putIfAbsent("batchName", bName);
            map.put("beetleCount", (int) map.getOrDefault("beetleCount", 0) + 1);
            touchBatchStartDate(map, getBeetleBatchStartDate(b));
        }

        for (CostRecord c : costs) {
            String bName = c.getBatchName();
            if (bName == null || bName.trim().isEmpty()) {
                bName = "无批次";
            }
            batchMap.putIfAbsent(bName, new HashMap<>());
            Map<String, Object> map = batchMap.get(bName);
            map.putIfAbsent("batchName", bName);

            double amount = c.getAmount() == null ? 0 : c.getAmount();
            if ("INCOME".equals(c.getType())) {
                map.put("totalIncome", (double) map.getOrDefault("totalIncome", 0.0) + amount);
            } else {
                map.put("totalExpense", (double) map.getOrDefault("totalExpense", 0.0) + amount);
            }
            touchBatchStartDate(map, getCostBatchStartDate(c));
        }

        List<Map<String, Object>> result = new ArrayList<>(batchMap.values());
        result.forEach(map -> {
            map.putIfAbsent("beetleCount", 0);
            map.putIfAbsent("totalIncome", 0.0);
            map.putIfAbsent("totalExpense", 0.0);
            map.putIfAbsent("batchStartDate", "");
        });

        result.sort((m1, m2) -> {
            if ("无批次".equals(m1.get("batchName"))) return 1;
            if ("无批次".equals(m2.get("batchName"))) return -1;
            int dateCompare = ((String) m2.getOrDefault("batchStartDate", "")).compareTo((String) m1.getOrDefault("batchStartDate", ""));
            if (dateCompare != 0) return dateCompare;
            return ((String) m2.get("batchName")).compareTo((String) m1.get("batchName"));
        });

        return result;
    }

    @GetMapping("/{batchName}")
    public Map<String, Object> getBatchDetails(HttpServletRequest request, @PathVariable String batchName) {
        Long userId = getUserId(request);
        List<Beetle> allBeetles = beetleRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<CostRecord> allCosts = costRepository.findByUserIdOrderByCreatedAtDesc(userId);

        List<Beetle> beetles = new ArrayList<>();
        List<CostRecord> costs = new ArrayList<>();

        boolean isNoBatch = "无批次".equals(batchName);

        for (Beetle b : allBeetles) {
            String bName = b.getBatchName();
            if (isNoBatch && (bName == null || bName.trim().isEmpty())) {
                beetles.add(b);
            } else if (!isNoBatch && batchName.equals(bName)) {
                beetles.add(b);
            }
        }

        for (CostRecord c : allCosts) {
            String bName = c.getBatchName();
            if (isNoBatch && (bName == null || bName.trim().isEmpty())) {
                costs.add(c);
            } else if (!isNoBatch && batchName.equals(bName)) {
                costs.add(c);
            }
        }

        beetles.sort((b1, b2) -> getBeetleSortDate(b2).compareTo(getBeetleSortDate(b1)));
        costs.sort((c1, c2) -> getCostSortDate(c2).compareTo(getCostSortDate(c1)));

        Map<String, Object> res = new HashMap<>();
        res.put("beetles", beetles);
        res.put("costs", costs);
        return res;
    }

    @PutMapping("/{oldName}")
    public Map<String, String> renameBatch(HttpServletRequest request, @PathVariable String oldName, @RequestParam String newName) {
        Long userId = getUserId(request);
        if (userId == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
        beetleRepository.updateBatchName(oldName, newName, userId);
        costRepository.updateBatchName(oldName, newName, userId);
        return Collections.singletonMap("status", "success");
    }

    @DeleteMapping("/{batchName}")
    public Map<String, String> clearBatch(HttpServletRequest request, @PathVariable String batchName) {
        Long userId = getUserId(request);
        if (userId == null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED);
        beetleRepository.clearBatchName(batchName, userId);
        costRepository.clearBatchName(batchName, userId);
        return Collections.singletonMap("status", "success");
    }
}
