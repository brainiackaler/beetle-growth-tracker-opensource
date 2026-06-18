package com.example.beetle;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.PrePersist;
import javax.persistence.PreUpdate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Entity
public class Beetle {
    @Id
    private String id;

    private String name;
    private String species;
    private String hatchDate;

    @Column(length = 2000)
    private String notes;

    private String createdAt;
    private String updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null || id.trim().isEmpty()) {
            id = UUID.randomUUID().toString();
        }
        String now = now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = now();
    }

    private String now() {
        return LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = clean(name); }
    public String getSpecies() { return species; }
    public void setSpecies(String species) { this.species = clean(species); }
    public String getHatchDate() { return hatchDate; }
    public void setHatchDate(String hatchDate) { this.hatchDate = clean(hatchDate); }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = clean(notes); }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
