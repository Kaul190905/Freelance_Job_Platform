package com.example.demo.controller;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiResponse;
import com.example.demo.service.BidService;

@RestController
@RequestMapping("/api/bids")
public class BidController {

    private final BidService bidService;

    public BidController(BidService bidService) {
        this.bidService = bidService;
    }

    @PostMapping
    public ApiResponse<String> createBid() {
        return bidService.createBid();
    }

    @PutMapping("/{id}/accept")
    public ApiResponse<String> acceptBid(@PathVariable Long id) {
        return bidService.acceptBid(id);
    }

    @PutMapping("/{id}/reject")
    public ApiResponse<String> rejectBid(@PathVariable Long id) {
        return bidService.rejectBid(id);
    }
}