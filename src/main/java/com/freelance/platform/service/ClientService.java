package com.freelance.platform.service;

import com.freelance.platform.dto.JobRequest;
import com.freelance.platform.dto.JobResponse;
import com.freelance.platform.dto.BidResponse;
import com.freelance.platform.exception.BadRequestException;
import com.freelance.platform.exception.ResourceNotFoundException;
import com.freelance.platform.model.* ;
import com.freelance.platform.repository.BidRepository;
import com.freelance.platform.repository.JobRepository;
import com.freelance.platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ClientService {

    @Autowired
    private JobRepository jobRepository;
    
    @Autowired
    private BidRepository bidRepository;
    
    @Autowired
    private UserRepository userRepository;

    public JobResponse postJob(Long clientId, JobRequest request) {
        User client = userRepository.findById(clientId).orElseThrow(() -> new ResourceNotFoundException("Client not found"));
        
        Job job = Job.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .budget(request.getBudget())
                .client(client)
                .status(JobStatus.OPEN)
                .build();
                
        Job savedJob = jobRepository.save(job);
        return mapToJobResponse(savedJob);
    }

    public List<JobResponse> getMyJobs(Long clientId) {
        User client = userRepository.findById(clientId).orElseThrow(() -> new ResourceNotFoundException("Client not found"));
        return jobRepository.findByClient(client).stream().map(this::mapToJobResponse).collect(Collectors.toList());
    }

    public List<BidResponse> getJobBids(Long clientId, Long jobId) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        if (!job.getClient().getId().equals(clientId)) {
            throw new BadRequestException("Unauthorized access to job bids");
        }
        return bidRepository.findByJob(job).stream().map(this::mapToBidResponse).collect(Collectors.toList());
    }

    public JobResponse acceptBid(Long clientId, Long bidId) {
        Bid bid = bidRepository.findById(bidId).orElseThrow(() -> new ResourceNotFoundException("Bid not found"));
        Job job = bid.getJob();
        
        if (!job.getClient().getId().equals(clientId)) {
            throw new BadRequestException("Unauthorized");
        }
        
        if (job.getStatus() != JobStatus.OPEN) {
            throw new BadRequestException("Job is no longer open");
        }
        
        bid.setStatus(BidStatus.ACCEPTED);
        bidRepository.save(bid);
        
        job.setStatus(JobStatus.HIRED);
        job.setFreelancer(bid.getFreelancer());
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
                .freelancerName(job.getFreelancer() != null ? job.getFreelancer().getName() : null)
                .createdAt(job.getCreatedAt())
                .build();
    }
    
    private BidResponse mapToBidResponse(Bid bid) {
        return BidResponse.builder()
                .id(bid.getId())
                .jobId(bid.getJob().getId())
                .jobTitle(bid.getJob().getTitle())
                .freelancerId(bid.getFreelancer().getId())
                .freelancerName(bid.getFreelancer().getName())
                .amount(bid.getAmount())
                .proposal(bid.getProposal())
                .status(bid.getStatus())
                .build();
    }
}
