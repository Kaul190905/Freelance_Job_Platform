import dao.UserDAO;

public class TestUser {

    public static void main(String[] args) {

        UserDAO.registerUser(
            "Arun",
            "arun@gmail.com",
            "1234",
            "client"
        );

    }

}