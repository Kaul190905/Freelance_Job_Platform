package dao;

import db.DBConnection;
import java.sql.Connection;
import java.sql.PreparedStatement;

public class JobDAO {

    public static void postJob(String title,String description,double budget,int clientId){

        try{

            Connection con = DBConnection.getConnection();

            String sql="INSERT INTO jobs(title,description,budget,client_id) VALUES(?,?,?,?)";

            PreparedStatement ps=con.prepareStatement(sql);

            ps.setString(1,title);
            ps.setString(2,description);
            ps.setDouble(3,budget);
            ps.setInt(4,clientId);
           

            ps.executeUpdate();

            System.out.println("Job Posted Successfully");

        }
        catch(Exception e){
            e.printStackTrace();
        }

    }

}