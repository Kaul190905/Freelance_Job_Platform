package com.freelance.platform.repository;

import com.freelance.platform.model.Transaction;
import com.freelance.platform.model.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    Optional<Transaction> findByJob(Job job);
    Optional<Transaction> findByRazorpayOrderId(String orderId);
}
