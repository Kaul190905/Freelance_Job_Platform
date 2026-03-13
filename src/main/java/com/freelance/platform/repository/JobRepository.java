package com.freelance.platform.repository;

import com.freelance.platform.model.Job;
import com.freelance.platform.model.JobStatus;
import com.freelance.platform.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface JobRepository extends JpaRepository<Job, Long> {
    List<Job> findByClient(User client);
    List<Job> findByFreelancer(User freelancer);
    List<Job> findByStatus(JobStatus status);
}
