package com.example.beetle;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import javax.servlet.http.HttpServletRequest;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class BeetleController {
    private final BeetleRepository beetles;
    private final GrowthRecordRepository records;
    private final ProductionRecordRepository productions;
    private final ProductionRecordHistoryRepository productionHistories;
    private final ReminderRuleRepository reminders;

    public BeetleController(
            BeetleRepository beetles,
            GrowthRecordRepository records,
            ProductionRecordRepository productions,
            ProductionRecordHistoryRepository productionHistories,
            ReminderRuleRepository reminders
    ) {
        this.beetles = beetles;
        this.records = records;
        this.productions = productions;
        this.productionHistories = productionHistories;
        this.reminders = reminders;
    }

    private Long getUserId(HttpServletRequest request) {
        return (Long) request.getAttribute("userId");
    }

    @GetMapping("/health")
    public Map<String, Boolean> health() {
        return Collections.singletonMap("ok", true);
    }

    @GetMapping("/beetles")
    public Map<String, List<Beetle>> listBeetles(HttpServletRequest request) {
        return Collections.singletonMap("items", beetles.findByUserIdOrderByCreatedAtDesc(getUserId(request)));
    }

    @PostMapping("/beetles")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Beetle> createBeetle(HttpServletRequest request, @RequestBody Beetle beetle) {
        beetle.setUserId(getUserId(request));
        return Collections.singletonMap("item", beetles.save(beetle));
    }

    @GetMapping("/beetles/{id}")
    public Map<String, Beetle> getBeetle(HttpServletRequest request, @PathVariable String id) {
        return Collections.singletonMap("item", findBeetle(id, getUserId(request)));
    }

    @PutMapping("/beetles/{id}")
    public Map<String, Beetle> updateBeetle(HttpServletRequest request, @PathVariable String id, @RequestBody Beetle input) {
        Beetle beetle = findBeetle(id, getUserId(request));
        beetle.setName(input.getName());
        beetle.setSpecies(input.getSpecies());
        beetle.setSubspecies(input.getSubspecies());
        beetle.setBloodline(input.getBloodline());
        beetle.setHatchDate(input.getHatchDate());
        beetle.setEmergenceDate(input.getEmergenceDate());
        beetle.setDormancyEndDate(input.getDormancyEndDate());
        beetle.setAdultLength(input.getAdultLength());
        beetle.setAdultWeight(input.getAdultWeight());
        beetle.setNotes(input.getNotes());
        beetle.setGender(input.getGender());
        beetle.setBeetleType(input.getBeetleType());
        beetle.setProductionRecord(input.getProductionRecord());
        beetle.setBatchName(input.getBatchName());
        // For imageUrls, we either update it or keep it (if not provided). Here we assume input provides it.
        // But since we aren't handling image edit in frontend, we should probably only update it if input has it.
        // Actually, the user only asked for adding photos on creation. Let's just allow backend to update it if not null.
        if (input.getImageUrls() != null) {
            beetle.setImageUrls(input.getImageUrls());
        }
        return Collections.singletonMap("item", beetles.save(beetle));
    }


    @PutMapping("/beetles/batch-update")
    public Map<String, String> updateBeetlesBatch(@RequestBody Map<String, Object> payload, HttpServletRequest request) {
        Long userId = getUserId(request);
        if (userId == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        @SuppressWarnings("unchecked")
        List<String> ids = (List<String>) payload.get("ids");
        String batchName = (String) payload.get("batchName");
        if (ids != null && !ids.isEmpty()) {
            beetles.assignBatchToIds(ids, "无批次".equals(batchName) ? null : batchName, userId);
        }
        return Collections.singletonMap("status", "success");
    }

    @DeleteMapping("/beetles/{id}")
    @Transactional
    public Map<String, Boolean> deleteBeetle(HttpServletRequest request, @PathVariable String id) {
        Beetle beetle = findBeetle(id, getUserId(request));
        records.deleteByBeetleId(beetle.getId());
        productionHistories.deleteByBeetleId(beetle.getId());
        productions.deleteByBeetleId(beetle.getId());
        reminders.deleteByBeetleId(beetle.getId());
        beetles.delete(beetle);
        return Collections.singletonMap("ok", true);
    }

    @GetMapping("/beetles/{id}/records")
    public Map<String, List<GrowthRecord>> listRecords(HttpServletRequest request, @PathVariable String id) {
        findBeetle(id, getUserId(request));
        return Collections.singletonMap("items", records.findByBeetleIdOrderByRecordDateDesc(id));
    }

    @PostMapping("/beetles/{id}/records")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, GrowthRecord> createRecord(HttpServletRequest request, @PathVariable String id, @RequestBody GrowthRecord record) {
        Beetle beetle = findBeetle(id, getUserId(request));
        record.setBeetleId(id);
        GrowthRecord savedRecord = records.save(record);
        syncBeetleLifecycle(beetle, savedRecord);
        return Collections.singletonMap("item", savedRecord);
    }

    @PutMapping("/beetles/{id}/records/{recordId}")
    @Transactional
    public Map<String, GrowthRecord> updateRecord(HttpServletRequest request, @PathVariable String id, @PathVariable String recordId, @RequestBody GrowthRecord input) {
        Beetle beetle = findBeetle(id, getUserId(request));
        GrowthRecord record = records.findById(recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "record_not_found"));
        if (!id.equals(record.getBeetleId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "record_not_found");
        }
        record.setRecordDate(input.getRecordDate());
        record.setStage(input.getStage());
        record.setWeight(input.getWeight());
        record.setLength(input.getLength());
        record.setTemperature(input.getTemperature());
        record.setHumidity(input.getHumidity());
        record.setNotes(input.getNotes());
        record.setImageUrls(input.getImageUrls());
        GrowthRecord savedRecord = records.save(record);
        syncBeetleLifecycle(beetle, savedRecord);
        return Collections.singletonMap("item", savedRecord);
    }

    @DeleteMapping("/beetles/{id}/records/{recordId}")
    public Map<String, Boolean> deleteRecord(HttpServletRequest request, @PathVariable String id, @PathVariable String recordId) {
        findBeetle(id, getUserId(request));
        GrowthRecord record = records.findById(recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "record_not_found"));
        if (!id.equals(record.getBeetleId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "record_not_found");
        }
        records.delete(record);
        return Collections.singletonMap("ok", true);
    }

    private Beetle findBeetle(String id, Long userId) {
        Beetle beetle = beetles.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
        if (!userId.equals(beetle.getUserId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found");
        }
        return beetle;
    }

    private void syncBeetleLifecycle(Beetle beetle, GrowthRecord record) {
        String targetType = lifecycleType(record.getStage());
        if (targetType == null) {
            return;
        }

        boolean changed = false;
        if (lifecycleRank(targetType) > lifecycleRank(beetle.getBeetleType())) {
            beetle.setBeetleType(targetType);
            changed = true;
        }

        if ("成虫".equals(targetType)) {
            if (isBlank(beetle.getEmergenceDate()) && !isBlank(record.getRecordDate())) {
                beetle.setEmergenceDate(record.getRecordDate());
                changed = true;
            }
            if (beetle.getAdultLength() == null) {
                Double length = parseMeasurement(record.getLength());
                if (length != null) {
                    beetle.setAdultLength(length);
                    changed = true;
                }
            }
            if (beetle.getAdultWeight() == null) {
                Double weight = parseMeasurement(record.getWeight());
                if (weight != null) {
                    beetle.setAdultWeight(weight);
                    changed = true;
                }
            }
        }

        if (changed) {
            beetles.save(beetle);
        }
    }

    private String lifecycleType(String stage) {
        if (isBlank(stage)) {
            return null;
        }
        if (stage.contains("成虫")) {
            return "成虫";
        }
        if (stage.contains("蛹")) {
            return "蛹";
        }
        if (stage.contains("幼虫")) {
            return "幼虫";
        }
        return null;
    }

    private int lifecycleRank(String stage) {
        String type = lifecycleType(stage);
        if ("成虫".equals(type)) {
            return 3;
        }
        if ("蛹".equals(type)) {
            return 2;
        }
        if ("幼虫".equals(type)) {
            return 1;
        }
        return 0;
    }

    private Double parseMeasurement(String value) {
        if (isBlank(value)) {
            return null;
        }
        try {
            return Double.valueOf(value.trim());
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    // --- Production Records ---
    @GetMapping("/productions")
    public Map<String, List<ProductionRecord>> listAllProductions(HttpServletRequest request) {
        List<String> beetleIds = beetles.findByUserIdOrderByCreatedAtDesc(getUserId(request))
                .stream()
                .map(Beetle::getId)
                .collect(Collectors.toList());
        if (beetleIds.isEmpty()) {
            return Collections.singletonMap("items", Collections.emptyList());
        }
        return Collections.singletonMap("items", productions.findByBeetleIdInOrderByCreatedAtDesc(beetleIds));
    }

    @GetMapping("/beetles/{id}/productions")
    public Map<String, List<ProductionRecord>> listProductions(HttpServletRequest request, @PathVariable String id) {
        findBeetle(id, getUserId(request));
        return Collections.singletonMap("items", productions.findByBeetleIdOrderByCreatedAtDesc(id));
    }

    @PostMapping("/beetles/{id}/productions")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public Map<String, ProductionRecord> createProduction(HttpServletRequest request, @PathVariable String id, @RequestBody ProductionRecord record) {
        findBeetle(id, getUserId(request));
        record.setBeetleId(id);
        ProductionRecord saved = productions.save(record);
        productionHistories.save(createProductionSnapshot(saved, "CREATED", saved.getCreatedAt()));
        return Collections.singletonMap("item", saved);
    }

    @PutMapping("/beetles/{id}/productions/{recordId}")
    @Transactional
    public Map<String, ProductionRecord> updateProduction(HttpServletRequest request, @PathVariable String id, @PathVariable String recordId, @RequestBody ProductionRecord input) {
        findBeetle(id, getUserId(request));
        ProductionRecord record = findProductionRecord(id, recordId);
        if (!hasProductionRecordChanges(record, input)) {
            return Collections.singletonMap("item", record);
        }
        if (!productionHistories.existsByProductionRecordId(recordId)) {
            productionHistories.save(createProductionSnapshot(record, "BASELINE", record.getCreatedAt()));
        }
        record.setMatingDate(input.getMatingDate());
        record.setMaleBeetle(input.getMaleBeetle());
        record.setLayBoxDate(input.getLayBoxDate());
        record.setRemoveDate(input.getRemoveDate());
        record.setEggCount(input.getEggCount());
        record.setExpectedHatchCount(input.getExpectedHatchCount());
        record.setHatchCount(input.getHatchCount());
        record.setNotes(input.getNotes());
        record.setImageUrls(input.getImageUrls());
        ProductionRecord saved = productions.save(record);
        productionHistories.save(createProductionSnapshot(saved, "UPDATED", null));
        return Collections.singletonMap("item", saved);
    }

    @GetMapping("/beetles/{id}/productions/{recordId}/history")
    public Map<String, List<ProductionRecordHistory>> listProductionHistory(
            HttpServletRequest request,
            @PathVariable String id,
            @PathVariable String recordId
    ) {
        findBeetle(id, getUserId(request));
        findProductionRecord(id, recordId);
        return Collections.singletonMap(
                "items",
                productionHistories.findByProductionRecordIdOrderByCreatedAtDescIdDesc(recordId)
        );
    }

    @DeleteMapping("/beetles/{id}/productions/{recordId}")
    @Transactional
    public Map<String, Boolean> deleteProduction(HttpServletRequest request, @PathVariable String id, @PathVariable String recordId) {
        findBeetle(id, getUserId(request));
        ProductionRecord record = findProductionRecord(id, recordId);
        productionHistories.deleteByProductionRecordId(recordId);
        productions.delete(record);
        return Collections.singletonMap("ok", true);
    }

    private ProductionRecord findProductionRecord(String beetleId, String recordId) {
        ProductionRecord record = productions.findById(recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "record_not_found"));
        if (!beetleId.equals(record.getBeetleId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "record_not_found");
        }
        return record;
    }

    private boolean hasProductionRecordChanges(ProductionRecord current, ProductionRecord input) {
        return !sameText(current.getMatingDate(), input.getMatingDate())
                || !sameText(current.getMaleBeetle(), input.getMaleBeetle())
                || !sameText(current.getLayBoxDate(), input.getLayBoxDate())
                || !sameText(current.getRemoveDate(), input.getRemoveDate())
                || !sameText(current.getEggCount(), input.getEggCount())
                || !sameText(current.getExpectedHatchCount(), input.getExpectedHatchCount())
                || !sameText(current.getHatchCount(), input.getHatchCount())
                || !sameText(current.getNotes(), input.getNotes())
                || !sameText(current.getImageUrls(), input.getImageUrls());
    }

    private boolean sameText(String left, String right) {
        return normalize(left).equals(normalize(right));
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private ProductionRecordHistory createProductionSnapshot(
            ProductionRecord record,
            String snapshotType,
            String createdAt
    ) {
        ProductionRecordHistory snapshot = new ProductionRecordHistory();
        snapshot.setProductionRecordId(record.getId());
        snapshot.setBeetleId(record.getBeetleId());
        snapshot.setSnapshotType(snapshotType);
        snapshot.setMatingDate(record.getMatingDate());
        snapshot.setMaleBeetle(record.getMaleBeetle());
        snapshot.setLayBoxDate(record.getLayBoxDate());
        snapshot.setRemoveDate(record.getRemoveDate());
        snapshot.setEggCount(record.getEggCount());
        snapshot.setExpectedHatchCount(record.getExpectedHatchCount());
        snapshot.setHatchCount(record.getHatchCount());
        snapshot.setNotes(record.getNotes());
        snapshot.setImageUrls(record.getImageUrls());
        snapshot.setCreatedAt(createdAt);
        return snapshot;
    }
}
