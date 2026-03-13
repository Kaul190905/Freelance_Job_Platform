package com.freelance.platform.controller;

import com.freelance.platform.dto.BidResponse;
import com.freelance.platform.dto.JobRequest;
import com.freelance.platform.dto.JobResponse;
import com.freelance.platform.security.UserPrincipal;
import com.freelance.platform.service.ClientService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client")
@CrossOrigin(origins = "*", maxAge = 3600)
@PreAuthorize("hasRole('CLIENT')")
public class ClientController {

    @Autowired
    private ClientService clientService;

    @PostMapping("/jobs")
    public ResponseEntity<JobResponse> postJob(@AuthenticationPrincipal UserPrincipal user,
                                               @Valid @RequestBody JobRequest request) {
        return ResponseEntity.ok(clientService.postJob(user.getId(), request));
    }

    @GetMapping("/my-jobs")
    public ResponseEntity<List<JobResponse>> getMyJobs(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(clientService.getMyJobs(user.getId()));
    }

    @GetMapping("/jobs/{jobId}/bids")
    public ResponseEntity<List<BidResponse>> getJobBids(@AuthenticationPrincipal UserPrincipal user,
                                                        @PathVariable Long jobId) {
        return ResponseEntity.ok(clientService.getJobBids(user.getId(), jobId));
    }

    @PutMapping("/bids/{bidId}/accept")
    public ResponseEntity<JobResponse> acceptBid(@AuthenticationPrincipal UserPrincipal user,
                                                 @PathVariable Long bidId) {
        return ResponseEntity.ok(clientService.acceptBid(user.getId(), bidId));
    }
}
