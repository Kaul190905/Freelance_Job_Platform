package com.freelance.platform.dto;

import com.freelance.platform.model.BidStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class BidResponse {
    private Long id;
    private Long jobId;
    private String jobTitle;
    private Long freelancerId;
    private String freelancerName;
    private Double amount;
    private String proposal;
    private BidStatus status;
}
