package com.example.beetle;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Index;
import javax.persistence.PrePersist;
import javax.persistence.Table;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Entity
@Table(
        name = "production_record_history",
        indexes = {
                @Index(name = "idx_production_history_record", columnList = "production_record_id"),
                @Index(name = "idx_production_history_beetle", columnList = "beetle_id")
        }
)
public class ProductionRecordHistory {
    private static final DateTimeFormatter UTC_TIMESTAMP_FORMATTER = DateTimeFormatter
            .ofPattern("yyyy-MM-dd HH:mm:ss.SSS'Z'")
            .withZone(ZoneOffset.UTC);

    @Id
    private String id;

    @Column(name = "production_record_id")
    private String productionRecordId;

    @Column(name = "beetle_id")
    private String beetleId;
    private String snapshotType;
    private String matingDate;
    private String maleBeetle;
    private String layBoxDate;
    private String removeDate;
    private String eggCount;
    private String expectedHatchCount;
    private String hatchCount;

    @Column(length = 2000)
    private String notes;

    @Column(length = 2000)
    private String imageUrls;

    private String createdAt;

    @PrePersist
    public void prePersist() {
        if (id == null || id.trim().isEmpty()) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null || createdAt.trim().isEmpty()) {
            createdAt = UTC_TIMESTAMP_FORMATTER.format(Instant.now());
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getProductionRecordId() { return productionRecordId; }
    public void setProductionRecordId(String productionRecordId) { this.productionRecordId = clean(productionRecordId); }

    public String getBeetleId() { return beetleId; }
    public void setBeetleId(String beetleId) { this.beetleId = clean(beetleId); }

    public String getSnapshotType() { return snapshotType; }
    public void setSnapshotType(String snapshotType) { this.snapshotType = clean(snapshotType); }

    public String getMatingDate() { return matingDate; }
    public void setMatingDate(String matingDate) { this.matingDate = clean(matingDate); }

    public String getMaleBeetle() { return maleBeetle; }
    public void setMaleBeetle(String maleBeetle) { this.maleBeetle = clean(maleBeetle); }

    public String getLayBoxDate() { return layBoxDate; }
    public void setLayBoxDate(String layBoxDate) { this.layBoxDate = clean(layBoxDate); }

    public String getRemoveDate() { return removeDate; }
    public void setRemoveDate(String removeDate) { this.removeDate = clean(removeDate); }

    public String getEggCount() { return eggCount; }
    public void setEggCount(String eggCount) { this.eggCount = clean(eggCount); }

    public String getExpectedHatchCount() { return expectedHatchCount; }
    public void setExpectedHatchCount(String expectedHatchCount) { this.expectedHatchCount = clean(expectedHatchCount); }

    public String getHatchCount() { return hatchCount; }
    public void setHatchCount(String hatchCount) { this.hatchCount = clean(hatchCount); }

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
