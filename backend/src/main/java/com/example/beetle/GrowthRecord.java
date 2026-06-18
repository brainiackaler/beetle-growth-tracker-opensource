package com.example.beetle;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.PrePersist;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Entity
public class GrowthRecord {
    @Id
    private String id;

    private String beetleId;
    private String recordDate;
    private String stage;
    private String weight;

    @Column(name = "body_length")
    private String length;

    private String temperature;
    private String humidity;

    @Column(length = 2000)
    private String notes;

    private String createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null || id.trim().isEmpty()) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getBeetleId() { return beetleId; }
    public void setBeetleId(String beetleId) { this.beetleId = clean(beetleId); }
    public String getRecordDate() { return recordDate; }
    public void setRecordDate(String recordDate) { this.recordDate = clean(recordDate); }
    public String getStage() { return stage; }
    public void setStage(String stage) { this.stage = clean(stage); }
    public String getWeight() { return weight; }
    public void setWeight(String weight) { this.weight = clean(weight); }
    public String getLength() { return length; }
    public void setLength(String length) { this.length = clean(length); }
    public String getTemperature() { return temperature; }
    public void setTemperature(String temperature) { this.temperature = clean(temperature); }
    public String getHumidity() { return humidity; }
    public void setHumidity(String humidity) { this.humidity = clean(humidity); }
    @Column(length = 2000)
    private String imageUrls;

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = clean(notes); }
    public String getImageUrls() { return imageUrls; }
    public void setImageUrls(String imageUrls) { this.imageUrls = clean(imageUrls); }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
