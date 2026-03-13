package com.freelance.platform.controller;

import com.freelance.platform.dto.PaymentOrderResponse;
import com.freelance.platform.dto.RazorpayCallback;
import com.freelance.platform.security.UserPrincipal;
import com.freelance.platform.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment")
@CrossOrigin(origins = "*", maxAge = 3600)
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    // Admin or Client can create an order to pay
    @PostMapping("/create-order/{jobId}")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<PaymentOrderResponse> createPaymentOrder(@AuthenticationPrincipal UserPrincipal user,
                                                                   @PathVariable Long jobId) {
        return ResponseEntity.ok(paymentService.createPaymentOrder(user.getId(), jobId));
    }

    // Called automatically by the frontend after user puts in Razorpay details
    @PostMapping("/verify")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<String> verifyPayment(@Valid @RequestBody RazorpayCallback callback) {
        return ResponseEntity.ok(paymentService.verifyPayment(callback));
    }

    // Called by the Client to release payment to the Freelancer after Job is complete
    @PutMapping("/release/{jobId}")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<String> releasePayment(@AuthenticationPrincipal UserPrincipal user,
                                                 @PathVariable Long jobId) {
        return ResponseEntity.ok(paymentService.releasePaymentToFreelancer(user.getId(), jobId));
    }
}
