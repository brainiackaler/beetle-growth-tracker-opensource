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

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class BeetleController {
    private final BeetleRepository beetles;
    private final GrowthRecordRepository records;

    @Value("${app.security.passcode:}")
    private String passcode;

    public BeetleController(BeetleRepository beetles, GrowthRecordRepository records) {
        this.beetles = beetles;
        this.records = records;
    }

    @PostMapping("/auth/login")
    public Map<String, Boolean> login(@RequestBody Map<String, String> body) {
        String input = body.get("passcode");
        if (passcode == null || passcode.trim().isEmpty()) {
            return Collections.singletonMap("ok", true);
        }
        if (passcode.trim().equals(input)) {
            return Collections.singletonMap("ok", true);
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid_passcode");
    }

    @GetMapping("/health")
    public Map<String, Boolean> health() {
        return Collections.singletonMap("ok", true);
    }

    @GetMapping("/beetles")
    public Map<String, List<Beetle>> listBeetles() {
        return Collections.singletonMap("items", beetles.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/beetles")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Beetle> createBeetle(@RequestBody Beetle beetle) {
        return Collections.singletonMap("item", beetles.save(beetle));
    }

    @GetMapping("/beetles/{id}")
    public Map<String, Beetle> getBeetle(@PathVariable String id) {
        return Collections.singletonMap("item", findBeetle(id));
    }

    @PutMapping("/beetles/{id}")
    public Map<String, Beetle> updateBeetle(@PathVariable String id, @RequestBody Beetle input) {
        Beetle beetle = findBeetle(id);
        beetle.setName(input.getName());
        beetle.setSpecies(input.getSpecies());
        beetle.setHatchDate(input.getHatchDate());
        beetle.setNotes(input.getNotes());
        return Collections.singletonMap("item", beetles.save(beetle));
    }

    @DeleteMapping("/beetles/{id}")
    @Transactional
    public Map<String, Boolean> deleteBeetle(@PathVariable String id) {
        Beetle beetle = findBeetle(id);
        records.deleteByBeetleId(beetle.getId());
        beetles.delete(beetle);
        return Collections.singletonMap("ok", true);
    }

    @GetMapping("/beetles/{id}/records")
    public Map<String, List<GrowthRecord>> listRecords(@PathVariable String id) {
        findBeetle(id);
        return Collections.singletonMap("items", records.findByBeetleIdOrderByRecordDateDesc(id));
    }

    @PostMapping("/beetles/{id}/records")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, GrowthRecord> createRecord(@PathVariable String id, @RequestBody GrowthRecord record) {
        findBeetle(id);
        record.setBeetleId(id);
        return Collections.singletonMap("item", records.save(record));
    }

    @PutMapping("/beetles/{id}/records/{recordId}")
    public Map<String, GrowthRecord> updateRecord(@PathVariable String id, @PathVariable String recordId, @RequestBody GrowthRecord input) {
        findBeetle(id);
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
        return Collections.singletonMap("item", records.save(record));
    }

    @DeleteMapping("/beetles/{id}/records/{recordId}")
    public Map<String, Boolean> deleteRecord(@PathVariable String id, @PathVariable String recordId) {
        findBeetle(id);
        GrowthRecord record = records.findById(recordId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "record_not_found"));
        if (!id.equals(record.getBeetleId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "record_not_found");
        }
        records.delete(record);
        return Collections.singletonMap("ok", true);
    }

    private Beetle findBeetle(String id) {
        return beetles.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "not_found"));
    }
}
