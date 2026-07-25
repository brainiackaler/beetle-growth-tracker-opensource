package com.example.beetle;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import javax.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/costs")
@CrossOrigin
public class CostController {

    @Autowired
    private CostRecordRepository costRepository;

    @Autowired
    private BeetleRepository beetleRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private Long getUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    private String normalizeBatchName(String batchName) {
        return batchName == null || batchName.trim().isEmpty() || "无批次".equals(batchName) ? null : batchName;
    }

    private List<String> extractLinkedBeetleIds(String beetlesInfo) {
        Set<String> ids = new HashSet<>();
        if (beetlesInfo == null || beetlesInfo.trim().isEmpty()) {
            return new ArrayList<>(ids);
        }
        try {
            JsonNode root = objectMapper.readTree(beetlesInfo);
            if (root.isArray()) {
                for (JsonNode beetleNode : root) {
                    JsonNode existingId = beetleNode.get("existingId");
                    if (existingId != null && existingId.isTextual() && !existingId.asText().trim().isEmpty()) {
                        ids.add(existingId.asText().trim());
                    }
                }
            }
        } catch (Exception ignored) {
            // Older records may have incomplete snapshots; ignore invalid JSON instead of blocking cost saves.
        }
        return new ArrayList<>(ids);
    }

    private void syncLinkedBeetlesBatch(CostRecord cost, Long userId) {
        List<String> beetleIds = extractLinkedBeetleIds(cost.getBeetlesInfo());
        if (!beetleIds.isEmpty()) {
            beetleRepository.assignBatchToIds(beetleIds, normalizeBatchName(cost.getBatchName()), userId);
        }
    }

    @GetMapping
    public List<CostRecord> getAllCosts(HttpServletRequest request) {
        return costRepository.findByUserIdOrderByCreatedAtDesc(getUserId(request));
    }

    @PostMapping
    public CostRecord addCost(HttpServletRequest request, @RequestBody CostRecord cost) {
        Long userId = getUserId(request);
        cost.setUserId(userId);
        CostRecord savedCost = costRepository.save(cost);
        syncLinkedBeetlesBatch(savedCost, userId);
        return savedCost;
    }

    @PostMapping("/batch")
    public Iterable<CostRecord> addCostsBatch(HttpServletRequest request, @RequestBody List<CostRecord> costs) {
        Long userId = getUserId(request);
        for (CostRecord cost : costs) {
            cost.setUserId(userId);
            cost.setId(null);
        }
        Iterable<CostRecord> savedCosts = costRepository.saveAll(costs);
        for (CostRecord cost : savedCosts) {
            syncLinkedBeetlesBatch(cost, userId);
        }
        return savedCosts;
    }

    @DeleteMapping("/{id}")
    public void deleteCost(HttpServletRequest request, @PathVariable String id) {
        CostRecord cost = costRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        if (!getUserId(request).equals(cost.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found");
        }
        costRepository.delete(cost);
    }

    @PutMapping("/{id}")
    public CostRecord updateCost(HttpServletRequest request, @PathVariable String id, @RequestBody CostRecord updatedCost) {
        CostRecord existing = costRepository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        if (!getUserId(request).equals(existing.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found");
        }
        existing.setType(updatedCost.getType());
        existing.setCategory(updatedCost.getCategory());
        existing.setAmount(updatedCost.getAmount());
        existing.setRecordDate(updatedCost.getRecordDate());
        existing.setDescription(updatedCost.getDescription());
        existing.setBeetleName(updatedCost.getBeetleName());
        existing.setBeetleSpecies(updatedCost.getBeetleSpecies());
        existing.setBeetleStage(updatedCost.getBeetleStage());
        existing.setBeetleGender(updatedCost.getBeetleGender());
        existing.setBeetleSize(updatedCost.getBeetleSize());
        existing.setBeetleInstar(updatedCost.getBeetleInstar());
        existing.setBeetlesInfo(updatedCost.getBeetlesInfo());
        existing.setImageUrls(updatedCost.getImageUrls());
        existing.setBatchName(updatedCost.getBatchName());
        CostRecord savedCost = costRepository.save(existing);
        syncLinkedBeetlesBatch(savedCost, getUserId(request));
        return savedCost;
    }

    @GetMapping("/summary")
    public Map<String, Object> getCostSummary(HttpServletRequest request) {
        List<CostRecord> allCosts = costRepository.findByUserIdOrderByCreatedAtDesc(getUserId(request));

        double totalExpense = 0.0;
        double totalIncome = 0.0;
        Map<String, Double> categoryBreakdown = new HashMap<>();

        for (CostRecord record : allCosts) {
            double amount = record.getAmount() != null ? record.getAmount() : 0.0;
            String category = record.getCategory() != null ? record.getCategory() : "OTHER";

            if ("EXPENSE".equalsIgnoreCase(record.getType())) {
                totalExpense += amount;
                categoryBreakdown.put(category, categoryBreakdown.getOrDefault(category, 0.0) + amount);
            } else if ("INCOME".equalsIgnoreCase(record.getType())) {
                totalIncome += amount;
            }
        }

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalExpense", totalExpense);
        summary.put("totalIncome", totalIncome);
        summary.put("profit", totalIncome - totalExpense);
        summary.put("categoryBreakdown", categoryBreakdown);

        return summary;
    }

    @PutMapping("/batch-update")
    public Map<String, String> updateCostsBatch(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        Long userId = getUserId(request);
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) payload.get("ids");
        String batchName = (String) payload.get("batchName");
        if (ids != null && !ids.isEmpty()) {
            List<CostRecord> selectedCosts = new ArrayList<>();
            costRepository.findAllById(ids).forEach(cost -> {
                if (userId.equals(cost.getUserId())) {
                    selectedCosts.add(cost);
                }
            });
            String normalizedBatchName = normalizeBatchName(batchName);
            costRepository.assignBatchToIds(ids, normalizedBatchName, userId);
            for (CostRecord cost : selectedCosts) {
                cost.setBatchName(normalizedBatchName);
                syncLinkedBeetlesBatch(cost, userId);
            }
        }
        return java.util.Collections.singletonMap("status", "success");
    }
}
