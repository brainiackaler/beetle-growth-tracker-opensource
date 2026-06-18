package com.example.beetle;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BeetleRepository extends JpaRepository<Beetle, String> {
    List<Beetle> findAllByOrderByCreatedAtDesc();
}
