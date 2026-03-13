package com.freelance.platform.service;

import com.freelance.platform.dto.BidRequest;
import com.freelance.platform.dto.BidResponse;
import com.freelance.platform.dto.JobResponse;
import com.freelance.platform.exception.BadRequestException;
import com.freelance.platform.exception.ResourceNotFoundException;
import com.freelance.platform.model.*;
import com.freelance.platform.repository.BidRepository;
import com.freelance.platform.repository.JobRepository;
import com.freelance.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FreelancerService {

    @Autowired
    private JobRepository jobRepository;
    
    @Autowired
    private BidRepository bidRepository;
    
    @Autowired
    private UserRepository userRepository;

    public List<JobResponse> browseOpenJobs() {
        return jobRepository.findByStatus(JobStatus.OPEN).stream()
                .map(this::mapToJobResponse).collect(Collectors.toList());
    }

    public BidResponse placeBid(Long freelancerId, BidRequest request) {
        User freelancer = userRepository.findById(freelancerId).orElseThrow(() -> new ResourceNotFoundException("Freelancer not found"));
        Job job = jobRepository.findById(request.getJobId()).orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        
        if (job.getStatus() != JobStatus.OPEN) {
            throw new BadRequestException("Job is not open for bidding");
        }
        
        Bid bid = Bid.builder()
                .amount(request.getAmount())
                .proposal(request.getProposal())
                .freelancer(freelancer)
                .job(job)
                .status(BidStatus.PENDING)
                .build();
                
        Bid savedBid = bidRepository.save(bid);
        return mapToBidResponse(savedBid);
    }
    
    public List<BidResponse> getMyBids(Long freelancerId) {
        User freelancer = userRepository.findById(freelancerId).orElseThrow(() -> new ResourceNotFoundException("Freelancer not found"));
        return bidRepository.findByFreelancer(freelancer).stream()
                .map(this::mapToBidResponse).collect(Collectors.toList());
    }
    
    public JobResponse markJobCompleted(Long freelancerId, Long jobId) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        
        if (job.getFreelancer() == null || !job.getFreelancer().getId().equals(freelancerId)) {
            throw new BadRequestException("You are not assigned to this job");
        }
        
        if (job.getStatus() != JobStatus.HIRED && job.getStatus() != JobStatus.IN_PROGRESS) {
            throw new BadRequestException("Job status is invalid for completion");
        }
        
        job.setStatus(JobStatus.COMPLETED);
        Job updatedJob = jobRepository.save(job);
        return mapToJobResponse(updatedJob);
    }

    private JobResponse mapToJobResponse(Job job) {
        return JobResponse.builder()
                .id(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .budget(job.getBudget())
                .status(job.getStatus())
                .clientId(job.getClient().getId())
                .clientName(job.getClient().getName())
                .freelancerId(job.getFreelancer() != null ? job.getFreelancer().getId() : null)
                .createdAt(job.getCreatedAt())
                .build();
    }
    
    private BidResponse mapToBidResponse(Bid bid) {
        return BidResponse.builder()
                .id(bid.getId())
                .jobId(bid.getJob().getId())
                .jobTitle(bid.getJob().getTitle())
                .freelancerId(bid.getFreelancer().getId())
                .amount(bid.getAmount())
                .proposal(bid.getProposal())
                .status(bid.getStatus())
                .build();
    }
}
