package com.freelance.platform.controller;

import com.freelance.platform.dto.BidRequest;
import com.freelance.platform.dto.BidResponse;
import com.freelance.platform.dto.JobResponse;
import com.freelance.platform.security.UserPrincipal;
import com.freelance.platform.service.FreelancerService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/freelancer")
@CrossOrigin(origins = "*", maxAge = 3600)
@PreAuthorize("hasRole('FREELANCER')")
public class FreelancerController {

    @Autowired
    private FreelancerService freelancerService;

    @GetMapping("/jobs")
    public ResponseEntity<List<JobResponse>> browseJobs() {
        return ResponseEntity.ok(freelancerService.browseOpenJobs());
    }

    @PostMapping("/bids")
    public ResponseEntity<BidResponse> placeBid(@AuthenticationPrincipal UserPrincipal user,
                                                @Valid @RequestBody BidRequest request) {
        return ResponseEntity.ok(freelancerService.placeBid(user.getId(), request));
    }

    @GetMapping("/my-bids")
    public ResponseEntity<List<BidResponse>> getMyBids(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(freelancerService.getMyBids(user.getId()));
    }

    @PutMapping("/jobs/{jobId}/complete")
    public ResponseEntity<JobResponse> markJobCompleted(@AuthenticationPrincipal UserPrincipal user,
                                                        @PathVariable Long jobId) {
        return ResponseEntity.ok(freelancerService.markJobCompleted(user.getId(), jobId));
    }
}
