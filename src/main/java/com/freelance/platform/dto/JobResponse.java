package com.freelance.platform.dto;

import com.freelance.platform.model.JobStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class JobResponse {
    private Long id;
    private String title;
    private String description;
    private Double budget;
    private JobStatus status;
    private Long clientId;
    private String clientName;
    private Long freelancerId;
    private String freelancerName;
    private LocalDateTime createdAt;
}
