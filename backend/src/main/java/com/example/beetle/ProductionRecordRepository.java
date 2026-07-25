package com.example.beetle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductionRecordRepository extends JpaRepository<ProductionRecord, String> {
    List<ProductionRecord> findByBeetleIdOrderByCreatedAtDesc(String beetleId);
    List<ProductionRecord> findByBeetleIdIn(List<String> beetleIds);
    List<ProductionRecord> findByBeetleIdInOrderByCreatedAtDesc(List<String> beetleIds);
    void deleteByBeetleId(String beetleId);
}
