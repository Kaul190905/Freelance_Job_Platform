package com.example.demo.service;

import org.springframework.stereotype.Service;

import com.example.demo.dto.ApiResponse;

@Service
public class BidService {

    public ApiResponse<String> createBid() {
        return new ApiResponse<>(true, "Bid created successfully", "Dummy bid created");
    }

    public ApiResponse<String> acceptBid(Long id) {
        return new ApiResponse<>(true, "Bid accepted successfully", "Accepted bid id: " + id);
    }

    public ApiResponse<String> rejectBid(Long id) {
        return new ApiResponse<>(true, "Bid rejected successfully", "Rejected bid id: " + id);
    }
}