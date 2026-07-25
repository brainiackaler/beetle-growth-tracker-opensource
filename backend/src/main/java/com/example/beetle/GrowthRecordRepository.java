package com.example.beetle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GrowthRecordRepository extends JpaRepository<GrowthRecord, String> {
    List<GrowthRecord> findByBeetleIdOrderByRecordDateDesc(String beetleId);
    List<GrowthRecord> findByBeetleIdIn(List<String> beetleIds);
    void deleteByBeetleId(String beetleId);
}
