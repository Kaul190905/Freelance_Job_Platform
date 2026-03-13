package com.example.demo.service;

import org.springframework.stereotype.Service;

import com.example.demo.dto.ApiResponse;
import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;

@Service
public class AuthService {

    public ApiResponse<String> register(RegisterRequest request) {
        return new ApiResponse<>(true, "Register successful", request.getEmail());
    }

    public ApiResponse<String> login(LoginRequest request) {
        return new ApiResponse<>(true, "Login successful", request.getEmail());
    }
}