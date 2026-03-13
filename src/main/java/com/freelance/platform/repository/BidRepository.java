package com.freelance.platform.repository;

import com.freelance.platform.model.Bid;
import com.freelance.platform.model.Job;
import com.freelance.platform.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BidRepository extends JpaRepository<Bid, Long> {
    List<Bid> findByJob(Job job);
    List<Bid> findByFreelancer(User freelancer);
}
