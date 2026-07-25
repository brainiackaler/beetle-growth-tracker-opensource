package com.example.beetle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductionRecordHistoryRepository extends JpaRepository<ProductionRecordHistory, String> {
    List<ProductionRecordHistory> findByProductionRecordIdOrderByCreatedAtDescIdDesc(String productionRecordId);
    boolean existsByProductionRecordId(String productionRecordId);
    void deleteByProductionRecordId(String productionRecordId);
    void deleteByBeetleId(String beetleId);
}
