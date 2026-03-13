package com.freelance.platform.service;

import com.freelance.platform.dto.PaymentOrderResponse;
import com.freelance.platform.dto.RazorpayCallback;
import com.freelance.platform.exception.BadRequestException;
import com.freelance.platform.exception.ResourceNotFoundException;
import com.freelance.platform.model.Job;
import com.freelance.platform.model.JobStatus;
import com.freelance.platform.model.PaymentStatus;
import com.freelance.platform.model.Transaction;
import com.freelance.platform.repository.JobRepository;
import com.freelance.platform.repository.TransactionRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import jakarta.annotation.PostConstruct;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpaySecret;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    private RazorpayClient razorpayClient;

    @PostConstruct
    public void init() throws Exception {
        this.razorpayClient = new RazorpayClient(razorpayKeyId, razorpaySecret);
    }

    public PaymentOrderResponse createPaymentOrder(Long clientId, Long jobId) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        
        if (!job.getClient().getId().equals(clientId)) {
            throw new BadRequestException("Unauthorized");
        }
        
        if (job.getStatus() != JobStatus.HIRED && job.getStatus() != JobStatus.COMPLETED) {
            throw new BadRequestException("Invalid job status for payment");
        }

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", (int)(job.getBudget() * 100)); // Amount in paise
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "txn_" + job.getId());

            Order order = razorpayClient.orders.create(orderRequest);

            Transaction transaction = Transaction.builder()
                    .job(job)
                    .amount(job.getBudget())
                    .razorpayOrderId(order.get("id"))
                    .status(PaymentStatus.CREATED)
                    .build();

            Transaction savedTrans = transactionRepository.save(transaction);

            return PaymentOrderResponse.builder()
                    .transactionId(savedTrans.getId())
                    .razorpayOrderId(savedTrans.getRazorpayOrderId())
                    .amount(savedTrans.getAmount())
                    .currency("INR")
                    .status(savedTrans.getStatus())
                    .build();

        } catch (Exception e) {
            throw new RuntimeException("Error creating Razorpay Order", e);
        }
    }

    public String verifyPayment(RazorpayCallback callback) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", callback.getRazorpayOrderId());
            options.put("razorpay_payment_id", callback.getRazorpayPaymentId());
            options.put("razorpay_signature", callback.getRazorpaySignature());

            boolean status = Utils.verifyPaymentSignature(options, razorpaySecret);

            Transaction transaction = transactionRepository.findByRazorpayOrderId(callback.getRazorpayOrderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));

            if (status) {
                transaction.setStatus(PaymentStatus.PAID);
                transaction.setRazorpayPaymentId(callback.getRazorpayPaymentId());
                transaction.setRazorpaySignature(callback.getRazorpaySignature());
                
                // Job moves to In Progress if it was Hired
                if (transaction.getJob().getStatus() == JobStatus.HIRED) {
                    Job job = transaction.getJob();
                    job.setStatus(JobStatus.IN_PROGRESS);
                    jobRepository.save(job);
                }
                
                transactionRepository.save(transaction);
                return "Payment successful";
            } else {
                transaction.setStatus(PaymentStatus.FAILED);
                transactionRepository.save(transaction);
                return "Payment failed or invalid signature";
            }
        } catch (Exception e) {
            throw new RuntimeException("Error verifying Razorpay signature", e);
        }
    }
    
    public String releasePaymentToFreelancer(Long clientId, Long jobId) {
        Job job = jobRepository.findById(jobId).orElseThrow(() -> new ResourceNotFoundException("Job not found"));
        
        if (!job.getClient().getId().equals(clientId)) {
            throw new BadRequestException("Unauthorized");
        }
        
        if (job.getStatus() != JobStatus.COMPLETED) {
            throw new BadRequestException("Job must be COMPLETED before releasing payment");
        }
        
        Transaction transaction = transactionRepository.findByJob(job)
                .orElseThrow(() -> new ResourceNotFoundException("No payment found for this job"));
                
        if (transaction.getStatus() != PaymentStatus.PAID) {
            throw new BadRequestException("Payment is not in escrow/PAID state");
        }
        
        // In a real scenario, here we use Razorpay Transfers API or RazorpayX to route funds to the freelancer's account.
        // For project demonstration, we just update the status.
        transaction.setStatus(PaymentStatus.RELEASED);
        transactionRepository.save(transaction);
        
        return "Payment released to Freelancer successfully!";
    }
}
