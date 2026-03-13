import dao.JobDAO;

public class TestJob {

    public static void main(String[] args) {

        JobDAO.postJob(
                "Build Portfolio Website",
                "Create a HTML CSS portfolio website",
                2000,
                1
                
        );

    }

}
