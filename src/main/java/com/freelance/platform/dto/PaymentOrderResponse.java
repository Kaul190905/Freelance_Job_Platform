package com.freelance.platform.dto;

import com.freelance.platform.model.PaymentStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PaymentOrderResponse {
    private Long transactionId;
    private String razorpayOrderId;
    private Double amount;
    private String currency;
    private PaymentStatus status;
}
