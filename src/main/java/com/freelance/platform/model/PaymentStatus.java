package com.freelance.platform.model;

public enum PaymentStatus {
    CREATED, // Order created in Razorpay
    PAID,    // Paid by Client, money in escrow/system
    RELEASED,// Released to Freelancer
    FAILED
}
