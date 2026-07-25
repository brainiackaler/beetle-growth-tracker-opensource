package com.example.beetle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BeetleRepository extends JpaRepository<Beetle, String> {
    List<Beetle> findAllByOrderByCreatedAtDesc();
    List<Beetle> findByUserIdOrderByCreatedAtDesc(Long userId);
    List<Beetle> findByUserIdIsNull();

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE Beetle b SET b.batchName = :newName WHERE b.batchName = :oldName AND b.userId = :userId")
    void updateBatchName(@org.springframework.data.repository.query.Param("oldName") String oldName, @org.springframework.data.repository.query.Param("newName") String newName, @org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE Beetle b SET b.batchName = null WHERE b.batchName = :batchName AND b.userId = :userId")
    void clearBatchName(@org.springframework.data.repository.query.Param("batchName") String batchName, @org.springframework.data.repository.query.Param("userId") Long userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @org.springframework.data.jpa.repository.Query("UPDATE Beetle b SET b.batchName = :batchName WHERE b.id IN :ids AND b.userId = :userId")
    void assignBatchToIds(@org.springframework.data.repository.query.Param("ids") List<String> ids, @org.springframework.data.repository.query.Param("batchName") String batchName, @org.springframework.data.repository.query.Param("userId") Long userId);
}
