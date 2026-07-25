package com.example.beetle;

import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface CostRecordRepository extends CrudRepository<CostRecord, String> {
    List<CostRecord> findAllByOrderByCreatedAtDesc();
    List<CostRecord> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<CostRecord> findByUserIdIsNull();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE CostRecord c SET c.batchName = :newName WHERE c.batchName = :oldName AND c.userId = :userId")
    void updateBatchName(@org.springframework.data.repository.query.Param("oldName") String oldName, @org.springframework.data.repository.query.Param("newName") String newName, @org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE CostRecord c SET c.batchName = null WHERE c.batchName = :batchName AND c.userId = :userId")
    void clearBatchName(@org.springframework.data.repository.query.Param("batchName") String batchName, @org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE CostRecord c SET c.batchName = :batchName WHERE c.id IN :ids AND c.userId = :userId")
    void assignBatchToIds(@org.springframework.data.repository.query.Param("ids") List<String> ids, @org.springframework.data.repository.query.Param("batchName") String batchName, @org.springframework.data.repository.query.Param("userId") Long userId);
}
