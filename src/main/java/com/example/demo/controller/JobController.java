package com.example.demo.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class JobController {

    @GetMapping("/jobs/test")
    public String jobTest() {
        return "Job controller working";
    }
}