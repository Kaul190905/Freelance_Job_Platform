package com.example.demo.service;

import org.springframework.stereotype.Service;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.JobRequest;

@Service
public class JobService {

    public ApiResponse<String> getAllJobs() {
        return new ApiResponse<>(true, "Jobs fetched successfully", "Dummy jobs list");
    }

    public ApiResponse<String> createJob(JobRequest request) {
        return new ApiResponse<>(true, "Job created successfully", request.getTitle());
    }

    public ApiResponse<String> getJobById(Long id) {
        return new ApiResponse<>(true, "Job fetched successfully", "Job id: " + id);
    }

    public ApiResponse<String> updateJob(Long id, JobRequest request) {
        return new ApiResponse<>(true, "Job updated successfully", "Updated job " + id + " - " + request.getTitle());
    }

    public ApiResponse<String> deleteJob(Long id) {
        return new ApiResponse<>(true, "Job deleted successfully", "Deleted job id: " + id);
    }
}