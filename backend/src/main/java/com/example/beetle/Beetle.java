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

    private String batchName;
    private String name;
    private String species;
    private String subspecies;
    private String bloodline;
    private String hatchDate;
    private String emergenceDate; // 羽化日期
    private String dormancyEndDate; // 出蛰伏日期
    private Double adultLength; // 成虫体长
    private Double adultWeight; // 成虫体重

    @Column(length = 2000)
    private String notes;

    private String gender; // e.g. "公虫", "母虫", "未辨识"
    private String beetleType; // "幼虫", "成虫"

    @Column(length = 2000)
    private String imageUrls;

    @Column(length = 2000)
    private String productionRecord;

    private String createdAt;
    private String updatedAt;

    @Column(name = "user_id")
    private Long userId;

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
    public String getBatchName() { return batchName; }
    public void setBatchName(String batchName) { this.batchName = clean(batchName); }
    public String getName() { return name; }
    public void setName(String name) { this.name = clean(name); }
    public String getSpecies() { return species; }
    public void setSpecies(String species) { this.species = clean(species); }
    public String getSubspecies() { return subspecies; }
    public void setSubspecies(String subspecies) { this.subspecies = clean(subspecies); }
    public String getBloodline() { return bloodline; }
    public void setBloodline(String bloodline) { this.bloodline = clean(bloodline); }
    public String getHatchDate() { return hatchDate; }
    public void setHatchDate(String hatchDate) { this.hatchDate = clean(hatchDate); }
    public String getEmergenceDate() { return emergenceDate; }
    public void setEmergenceDate(String emergenceDate) { this.emergenceDate = clean(emergenceDate); }
    public String getDormancyEndDate() { return dormancyEndDate; }
    public void setDormancyEndDate(String dormancyEndDate) { this.dormancyEndDate = clean(dormancyEndDate); }
    public Double getAdultLength() { return adultLength; }
    public void setAdultLength(Double adultLength) { this.adultLength = adultLength; }
    public Double getAdultWeight() { return adultWeight; }
    public void setAdultWeight(Double adultWeight) { this.adultWeight = adultWeight; }
    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = clean(notes); }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = clean(gender); }
    public String getImageUrls() { return imageUrls; }
    public void setImageUrls(String imageUrls) { this.imageUrls = clean(imageUrls); }
    public String getProductionRecord() { return productionRecord; }
    public void setProductionRecord(String productionRecord) { this.productionRecord = clean(productionRecord); }
    public String getBeetleType() { return beetleType; }
    public void setBeetleType(String beetleType) { this.beetleType = clean(beetleType); }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }
}
